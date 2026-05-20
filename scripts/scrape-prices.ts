import fs from "fs"
import path from "path"
import { chromium, type Page } from "playwright"
import yaml from "js-yaml"
import { Product, PriceSnapshot } from "../src/types/product"

const DATA_DIR = path.join(process.cwd(), "data")
const TODAY = new Date().toISOString().slice(0, 10)

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
): Promise<{ price: number; inStock: boolean } | null> {
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
    return { price, inStock }
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
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  })

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  })

  // Mask webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined })
  })

  const page = await context.newPage()

  console.log(`\nScraping ${products.length} products for ${TODAY}...\n`)

  for (const product of products) {
    console.log(`→ ${product.name}`)

    // Try Amazon first
    if (product.amazon_asin) {
      const result = await scrapeAmazon(page, product.amazon_asin)
      if (result) {
        savePrice(product.slug, {
          date: TODAY,
          price_usd: result.price,
          source: "amazon",
          in_stock: result.inStock,
          affiliate_url: `https://www.amazon.com/dp/${product.amazon_asin}?tag=${process.env.AMAZON_ASSOCIATE_TAG ?? ""}`,
        })
        // Polite delay
        await page.waitForTimeout(2000 + Math.random() * 2000)
        continue
      }
      console.warn(`  [warn] Amazon failed for ${product.slug}, trying B&H...`)
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
