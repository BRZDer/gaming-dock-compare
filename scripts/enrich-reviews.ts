/**
 * Headless review data enrichment script.
 * Sources: Amazon (star rating), Wirecutter (pick status), Tom's Hardware (review URLs).
 * Updates YAML files in-place. Safe to re-run — only writes if value changed.
 *
 * Run: npm run enrich
 */

import fs from "fs"
import path from "path"
import { chromium, type Page } from "playwright"
import yaml from "js-yaml"
import { Product } from "../src/types/product"

const PRODUCTS_DIR = path.join(process.cwd(), "data", "products")

function loadProductFiles(): { file: string; product: Product }[] {
  return fs
    .readdirSync(PRODUCTS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => ({
      file: path.join(PRODUCTS_DIR, f),
      product: yaml.load(fs.readFileSync(path.join(PRODUCTS_DIR, f), "utf-8")) as Product,
    }))
}

function updateYaml(filePath: string, updates: Record<string, unknown>) {
  const raw = yaml.load(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>
  let changed = false

  for (const [keyPath, value] of Object.entries(updates)) {
    const parts = keyPath.split(".")
    let obj = raw
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]] || typeof obj[parts[i]] !== "object") {
        obj[parts[i]] = {}
      }
      obj = obj[parts[i]] as Record<string, unknown>
    }
    const leaf = parts[parts.length - 1]
    if (obj[leaf] !== value) {
      obj[leaf] = value
      changed = true
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, yaml.dump(raw, { lineWidth: 120, quotingType: '"' }))
    return true
  }
  return false
}

// ── Amazon: star rating + review count ────────────────────────────────────────

async function scrapeAmazonRating(
  page: Page,
  asin: string
): Promise<{ rating: number; reviewCount: number } | null> {
  try {
    await page.goto(`https://www.amazon.com/dp/${asin}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    })

    const hasCaptcha = (await page.locator('form[action="/errors/validateCaptcha"]').count()) > 0
    if (hasCaptcha) return null

    const ratingText = await page
      .locator('[data-hook="rating-out-of-text"], #acrPopover [title]')
      .first()
      .getAttribute("title")
      .catch(() => null)

    const countText = await page
      .locator('[data-hook="total-review-count"], #acrCustomerReviewText')
      .first()
      .textContent()
      .catch(() => null)

    if (!ratingText) return null

    const ratingMatch = ratingText.match(/([0-9.]+)/)
    if (!ratingMatch) return null
    const rating = parseFloat(ratingMatch[1])

    const countMatch = (countText ?? "").replace(/,/g, "").match(/([0-9]+)/)
    const reviewCount = countMatch ? parseInt(countMatch[1]) : 0

    return { rating, reviewCount }
  } catch {
    return null
  }
}

// ── Wirecutter: scrape their docking station guide for picks ──────────────────

const WIRECUTTER_URLS = [
  "https://www.nytimes.com/wirecutter/reviews/best-thunderbolt-docking-stations/",
  "https://www.nytimes.com/wirecutter/reviews/best-usb-c-hubs-and-docks/",
]

async function scrapeWirecutter(page: Page): Promise<Map<string, boolean>> {
  const picks = new Map<string, boolean>()

  for (const url of WIRECUTTER_URLS) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 })

      // Check for paywall
      const bodyText = (await page.locator("body").textContent().catch(() => "")) ?? ""
      if (bodyText.length < 500) continue

      // Extract all product names mentioned in pick/runner-up headings
      const headings = await page.locator("h2, h3, h4").allTextContents().catch(() => [])
      const allText = headings.join(" ").toLowerCase()

      const PRODUCTS_TO_MATCH: [string, string[]][] = [
        ["caldigit-ts4", ["caldigit ts4", "ts4"]],
        ["caldigit-ts5-plus", ["caldigit ts5", "ts5 plus"]],
        ["caldigit-element-hub", ["element hub", "caldigit element"]],
        ["plugable-tbt4-udz", ["plugable tbt4", "plugable thunderbolt 4"]],
        ["plugable-tbt5-dock", ["plugable tbt5", "plugable thunderbolt 5"]],
        ["owc-thunderbolt-dock", ["owc thunderbolt dock"]],
        ["razer-thunderbolt-4-dock-chroma", ["razer thunderbolt", "razer chroma"]],
        ["belkin-thunderbolt-4-dock-pro", ["belkin thunderbolt 4 pro", "belkin connect"]],
        ["kensington-sd5700t", ["kensington sd5700", "sd5700t"]],
        ["dell-wd22tb4", ["dell wd22", "wd22tb4"]],
        ["anker-777", ["anker 777"]],
        ["anker-apex-12in1-tb4", ["anker apex", "anker 12"]],
        ["hp-thunderbolt-dock-280w", ["hp thunderbolt"]],
        ["lenovo-thinkpad-thunderbolt4-dock", ["lenovo thunderbolt"]],
        ["startech-tb4-dock", ["startech"]],
        ["satechi-thunderbolt-4-slim-dock", ["satechi thunderbolt"]],
        ["corsair-tbt100-thunderbolt3", ["corsair tbt100"]],
        ["elgato-thunderbolt-3-mini-dock", ["elgato thunderbolt"]],
      ]

      for (const [slug, aliases] of PRODUCTS_TO_MATCH) {
        for (const alias of aliases) {
          if (allText.includes(alias)) {
            picks.set(slug, true)
            break
          }
        }
      }
    } catch {
      // continue to next URL
    }
  }

  return picks
}

// ── Tom's Hardware: search for review URL per product ────────────────────────

async function searchTomshardware(page: Page, productName: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${productName} review site:tomshardware.com`)
    await page.goto(`https://www.google.com/search?q=${query}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    })

    const links = await page.locator("a[href*='tomshardware.com']").all()
    for (const link of links.slice(0, 5)) {
      const href = await link.getAttribute("href").catch(() => null)
      if (href?.includes("tomshardware.com") && href.includes("review")) {
        // Extract clean URL from Google redirect
        const match = href.match(/url=([^&]+)/)
        const url = match ? decodeURIComponent(match[1]) : href
        if (url.startsWith("https://www.tomshardware.com") && url.includes("review")) {
          return url
        }
      }
    }
    return null
  } catch {
    return null
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const entries = loadProductFiles()
  console.log(`\nEnriching ${entries.length} products...\n`)

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage"],
  })

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined })
  })

  const page = await context.newPage()

  // ── 1. Wirecutter picks (one-time fetch for all products) ──────────────────
  console.log("→ Wirecutter: scraping pick status...")
  const wirecutterPicks = await scrapeWirecutter(page)
  console.log(`  Found ${wirecutterPicks.size} picks\n`)

  let totalUpdated = 0

  // ── 2. Per-product: Amazon rating + Tom's Hardware ─────────────────────────
  for (const { file, product } of entries) {
    console.log(`→ ${product.name}`)
    const updates: Record<string, unknown> = {}

    // Wirecutter pick
    if (wirecutterPicks.has(product.slug)) {
      updates["reviews.wirecutter_pick"] = wirecutterPicks.get(product.slug)
    }

    // Amazon rating
    if (product.amazon_asin) {
      const rating = await scrapeAmazonRating(page, product.amazon_asin)
      if (rating) {
        updates["reviews.amazon_rating"] = rating.rating
        updates["reviews.amazon_review_count"] = rating.reviewCount
        console.log(`  Amazon: ${rating.rating}★ (${rating.reviewCount.toLocaleString()} reviews)`)
      }
      await page.waitForTimeout(1500 + Math.random() * 1500)
    }

    // Tom's Hardware — only search if no URL yet
    if (!product.reviews?.tomshardware_url) {
      const thUrl = await searchTomshardware(page, product.name)
      if (thUrl) {
        updates["reviews.tomshardware_url"] = thUrl
        console.log(`  Tom's HW: ${thUrl}`)
      }
      await page.waitForTimeout(1000 + Math.random() * 1000)
    }

    if (Object.keys(updates).length > 0) {
      const changed = updateYaml(file, updates)
      if (changed) {
        totalUpdated++
        console.log(`  [updated] ${product.slug}`)
      }
    } else {
      console.log(`  [skip] no new data`)
    }
  }

  await browser.close()
  console.log(`\nDone. ${totalUpdated}/${entries.length} products enriched.`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
