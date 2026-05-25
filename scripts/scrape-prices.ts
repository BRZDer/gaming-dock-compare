import fs from "fs"
import path from "path"
import { chromium } from "playwright-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import type { Page } from "playwright"
import yaml from "js-yaml"
import { Product, PriceSnapshot } from "../src/types/product"

chromium.use(StealthPlugin())

// ── HTTP fetch-based Amazon scraper (no browser, no fingerprint) ──────────────

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Ch-Ua": '"Chromium";v="136", "Google Chrome";v="136", "Not-A.Brand";v="8"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
}

class CookieJar {
  private jar: Map<string, string> = new Map()

  update(headers: Headers) {
    // Node 18 fetch doesn't expose Set-Cookie as array easily; parse raw header
    const raw = headers.get("set-cookie") ?? ""
    for (const chunk of raw.split(/,(?=[^ ])/)) {
      const pair = chunk.split(";")[0].trim()
      const eq = pair.indexOf("=")
      if (eq > 0) this.jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
    }
  }

  toString() {
    return Array.from(this.jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ")
  }
}

const cookieJar = new CookieJar()

async function fetchAmazonHtml(asin: string): Promise<string | null> {
  try {
    const scraperKey = process.env.SCRAPERAPI_KEY
    const targetUrl = `https://www.amazon.com/dp/${asin}`

    // Use ScraperAPI if key is available (handles IP rotation + CAPTCHA bypass)
    const url = scraperKey
      ? `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(targetUrl)}&country_code=us`
      : targetUrl

    const cookies = cookieJar.toString()
    const res = await fetch(url, {
      headers: { ...FETCH_HEADERS, ...(cookies ? { Cookie: cookies } : {}) },
      redirect: "follow",
    })
    if (!scraperKey) cookieJar.update(res.headers)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function parseAmazonHtml(html: string): { price: number; inStock: boolean; rating?: number; reviewCount?: number } | null {
  // Detect CAPTCHA / robot check / 404
  if (
    html.includes('action="/errors/validateCaptcha"') ||
    html.includes("we just need to make sure you're a real person") ||
    html.includes("<title>\n      Page Not Found")
  ) {
    return null
  }

  // Price: try corePriceDisplay section first (scoped to avoid picking up accessories/sponsored)
  let price: number | null = null
  const coreIdx = html.indexOf("corePriceDisplay_desktop_feature_div")
  const apexIdx = html.indexOf("apex_desktop_newAccordionRow")
  const searchFrom = coreIdx >= 0 ? coreIdx : apexIdx >= 0 ? apexIdx : 0
  const searchSection = html.slice(searchFrom, searchFrom > 0 ? searchFrom + 4000 : html.length)

  // Look for a-offscreen price span (screen-reader price — reliable)
  const offscreenMatch = searchSection.match(/<span[^>]+class="[^"]*a-offscreen[^"]*"[^>]*>\$([0-9,]+\.[0-9]{2})<\/span>/)
  if (offscreenMatch) {
    price = parseFloat(offscreenMatch[1].replace(/,/g, ""))
  }

  // Fallback: a-price-whole + a-price-fraction (rendered price components)
  if (!price) {
    const wholeMatch = searchSection.match(/class="a-price-whole">([0-9,]+)/)
    const fracMatch = searchSection.match(/class="a-price-fraction">([0-9]{2})/)
    if (wholeMatch) {
      price = parseFloat(`${wholeMatch[1].replace(/,/g, "")}.${fracMatch?.[1] ?? "00"}`)
    }
  }

  if (!price || isNaN(price) || price <= 0) return null

  // Stock: add-to-cart button present
  const inStock = html.includes('id="add-to-cart-button"')

  // Rating: first occurrence (product's own rating, not cross-sell)
  const ratingMatch = html.match(/([0-9.]+) out of 5 stars/)
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined

  // Review count: id="acrCustomerReviewText"
  const reviewMatch = html.match(/id="acrCustomerReviewText"[^>]*>\(?([\d,]+)/)
  const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, "")) : undefined

  return { price, inStock, rating, reviewCount }
}

async function scrapeAmazonFetch(asin: string): Promise<{ price: number; inStock: boolean; rating?: number; reviewCount?: number } | null> {
  const html = await fetchAmazonHtml(asin)
  if (!html) return null
  return parseAmazonHtml(html)
}

const PRODUCTS_DIR = path.join(process.cwd(), "data", "products")

const DATA_DIR = path.join(process.cwd(), "data")
const TODAY = new Date().toISOString().slice(0, 10)

function updateProductRating(slug: string, rating: number, reviewCount: number) {
  const file = path.join(PRODUCTS_DIR, `${slug}.yaml`)
  if (!fs.existsSync(file)) return
  const raw = yaml.load(fs.readFileSync(file, "utf-8")) as Record<string, unknown>
  const reviews = (raw.reviews ?? {}) as Record<string, unknown>
  reviews.amazon_rating = rating
  reviews.amazon_review_count = reviewCount
  raw.reviews = reviews
  fs.writeFileSync(file, yaml.dump(raw, { lineWidth: 120 }))
}

function loadProducts(): Product[] {
  const dir = path.join(DATA_DIR, "products")
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => yaml.load(fs.readFileSync(path.join(dir, f), "utf-8")) as Product)
}

function savePrice(slug: string, snapshot: PriceSnapshot) {
  const dir = path.join(DATA_DIR, "prices", slug)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${TODAY}.json`)
  // Never overwrite existing day's data
  if (fs.existsSync(file)) {
    console.log(`  [skip] ${slug} — already scraped today`)
    return
  }
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2))
  console.log(`  [ok] ${slug} — $${snapshot.price_usd} (${snapshot.source})`)
}

async function scrapeAmazon(
  page: Page,
  asin: string
): Promise<{ price: number; inStock: boolean; rating?: number; reviewCount?: number } | null> {
  try {
    await page.goto(`https://www.amazon.com/dp/${asin}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    })

    // Detect actual captcha — specific form action, not body text search
    const hasCaptchaForm = (await page.locator('form[action="/errors/validateCaptcha"]').count()) > 0
    if (hasCaptchaForm) {
      console.warn(`  [warn] Amazon CAPTCHA triggered for ASIN ${asin}`)
      return null
    }

    // Scope to the main price display block — avoids picking up comparison/other-seller prices
    // Note: from non-US IPs Amazon shows local currency. Production runs on GitHub Actions
    // US-region runners so prices will always be in USD there.
    const scope = page.locator("#corePriceDisplay_desktop_feature_div")
    if ((await scope.count()) === 0) return null

    const wholeText = await scope.locator(".a-price-whole").first().textContent().catch(() => null)
    if (!wholeText) return null

    const fracText = await scope.locator(".a-price-fraction").first().textContent().catch(() => "00")
    const whole = wholeText.replace(/[^0-9]/g, "")
    const frac = (fracText ?? "00").replace(/[^0-9]/g, "").padEnd(2, "0")
    const price = parseFloat(`${whole}.${frac}`)
    if (isNaN(price) || price <= 0) return null

    const inStock = (await page.locator("#add-to-cart-button").count()) > 0

    // Extract star rating and review count
    const ratingAttr = await page
      .locator("#acrPopover")
      .getAttribute("title")
      .catch(() => null)
    const ratingMatch = (ratingAttr ?? "").match(/([0-9.]+)\s+out of/)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined

    const reviewText = await page
      .locator("#acrCustomerReviewText")
      .first()
      .textContent()
      .catch(() => null)
    const reviewMatch = (reviewText ?? "").replace(/,/g, "").match(/([0-9]+)/)
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : undefined

    return { price, inStock, rating, reviewCount }
  } catch {
    return null
  }
}

async function scrapeBH(
  page: Page,
  bhSku: string
): Promise<{ price: number; inStock: boolean } | null> {
  try {
    await page.goto(`https://www.bhphotovideo.com/c/product/${bhSku}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    })

    const priceText = await page
      .locator('[data-selenium="price"]')
      .first()
      .textContent({ timeout: 5000 })
    if (!priceText) return null

    const price = parseFloat(priceText.replace(/[^0-9.]/g, ""))
    if (isNaN(price) || price <= 0) return null

    const inStockEl = page.locator('[data-selenium="addToCartButton"]')
    const inStock = (await inStockEl.count()) > 0

    return { price, inStock }
  } catch {
    return null
  }
}

async function main() {
  const products = loadProducts()
  const errors: string[] = []

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  })

  const page = await context.newPage()

  // Warm up: fetch Amazon homepage via HTTP to seed cookie jar before product pages
  console.log("Warming up cookie jar...")
  const warmRes = await fetch("https://www.amazon.com", { headers: FETCH_HEADERS, redirect: "follow" }).catch(() => null)
  if (warmRes) cookieJar.update(warmRes.headers)
  await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000))

  console.log(`\nScraping ${products.length} products for ${TODAY}...\n`)

  for (const product of products) {
    console.log(`→ ${product.name}`)

    // Skip products with no price sources configured
    if (!product.amazon_asin && !product.bh_sku) {
      console.log(`  [skip] ${product.slug} — no price source (manual only)`)
      continue
    }

    // Try Amazon via HTTP fetch first (no browser fingerprint)
    if (product.amazon_asin) {
      const result = await scrapeAmazonFetch(product.amazon_asin)
      if (result) {
        savePrice(product.slug, {
          date: TODAY,
          price_usd: result.price,
          source: "amazon",
          in_stock: result.inStock,
          affiliate_url: `https://www.amazon.com/dp/${product.amazon_asin}?tag=${process.env.AMAZON_ASSOCIATE_TAG ?? ""}`,
        })
        if (result.rating !== undefined && result.reviewCount !== undefined) {
          updateProductRating(product.slug, result.rating, result.reviewCount)
          console.log(`  [rating] ${result.rating}★ (${result.reviewCount.toLocaleString()} reviews)`)
        }
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500))
        continue
      }
      console.warn(`  [warn] Amazon fetch failed for ${product.slug}, trying B&H...`)
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000))
    }

    // Fallback: B&H
    if (product.bh_sku) {
      const result = await scrapeBH(page, product.bh_sku)
      if (result) {
        savePrice(product.slug, {
          date: TODAY,
          price_usd: result.price,
          source: "bh",
          in_stock: result.inStock,
          affiliate_url: `https://www.bhphotovideo.com/c/product/${product.bh_sku}`,
        })
        await page.waitForTimeout(2000 + Math.random() * 2000)
        continue
      }
    }

    // Both failed
    errors.push(`${product.slug}: no price found (ASIN: ${product.amazon_asin ?? "none"}, B&H: ${product.bh_sku ?? "none"})`)
    console.error(`  [fail] ${product.slug} — could not get price from any source`)
    await page.waitForTimeout(2000 + Math.random() * 1000)
  }

  await browser.close()

  if (errors.length > 0) {
    const logFile = path.join(process.cwd(), "scrape-errors.log")
    const entry = `\n=== ${TODAY} ===\n${errors.join("\n")}\n`
    fs.appendFileSync(logFile, entry)
    console.error(`\n${errors.length} errors logged to scrape-errors.log`)
  }

  console.log(`\nDone. ${products.length - errors.length}/${products.length} products updated.`)
}

main().catch((err) => {
  console.error("Fatal scraper error:", err)
  process.exit(1)
})
