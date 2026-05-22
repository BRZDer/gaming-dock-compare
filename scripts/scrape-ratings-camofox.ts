/**
 * Scrapes Amazon star ratings + review counts via Camofox (local anti-detection browser).
 * Ratings are locale-independent — same value from any IP.
 * Requires Camofox running at http://localhost:9377
 *
 * Run: npm run scrape:ratings
 */

import fs from "fs"
import path from "path"
import yaml from "js-yaml"
import { Product } from "../src/types/product"

const CAMOFOX = "http://localhost:9377"
const PRODUCTS_DIR = path.join(process.cwd(), "data", "products")
const SESSION = "ratings-scraper"

async function camofox(method: string, endpoint: string, body?: object) {
  const res = await fetch(`${CAMOFOX}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify({ userId: SESSION, sessionKey: SESSION, ...body }) : undefined,
  })
  return res.json()
}

async function openTab(url: string): Promise<string> {
  const res = await camofox("POST", "/tabs", { url }) as { tabId: string }
  return res.tabId
}

async function navigateTo(tabId: string, url: string) {
  await camofox("POST", `/tabs/${tabId}/navigate`, { url })
  await new Promise((r) => setTimeout(r, 4000))
}

async function getSnapshot(tabId: string): Promise<string> {
  const res = await camofox("GET", `/tabs/${tabId}/snapshot?userId=${SESSION}&sessionKey=${SESSION}`) as { snapshot?: string }
  return res.snapshot ?? ""
}

async function dismissInterstitial(tabId: string, snap: string): Promise<string> {
  if (!snap.includes("Continue shopping")) return snap
  const ref = snap.match(/button "Continue shopping" \[(\w+)\]/)
  if (!ref) return snap
  await camofox("POST", `/tabs/${tabId}/click`, { ref: ref[1] })
  await new Promise((r) => setTimeout(r, 4000))
  return getSnapshot(tabId)
}

async function closeTab(tabId: string) {
  await fetch(`${CAMOFOX}/tabs/${tabId}?userId=${SESSION}&sessionKey=${SESSION}`, { method: "DELETE" })
}

function parseRating(snapshot: string, asin: string): { rating: number; reviewCount: number } | null {
  // Amazon (Taiwan IP) puts the product's own rating in recommendation links
  // whose URL contains the ASIN: link "4.1 out of 5 stars, 1,721 ratings" + /url: /product-reviews/{ASIN}/...
  // Find the block where ASIN appears in the URL, then grab the rating from the link text above it
  const lines = snapshot.split("\n")
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`/product-reviews/${asin}/`)) {
      // Look backward up to 3 lines for the link text with rating
      for (let j = Math.max(0, i - 3); j <= i; j++) {
        const m = lines[j].match(/link "([0-9.]+) out of 5 stars,\s*([\d,]+)\s*ratings?"/)
        if (m) {
          return {
            rating: parseFloat(m[1]),
            reviewCount: parseInt(m[2].replace(/,/g, "")),
          }
        }
      }
    }
  }

  // Fallback: button format (US IP layout)
  const btnMatch = snapshot.match(/button "([0-9.]+) out of 5 stars"/)
  if (btnMatch) {
    const reviewMatch = snapshot.match(/link "([0-9,]+)\s+(?:ratings?|reviews?)"/)
    return {
      rating: parseFloat(btnMatch[1]),
      reviewCount: reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, "")) : 0,
    }
  }

  return null
}

function updateYamlRating(slug: string, rating: number, reviewCount: number): boolean {
  const file = path.join(PRODUCTS_DIR, `${slug}.yaml`)
  if (!fs.existsSync(file)) return false
  const raw = yaml.load(fs.readFileSync(file, "utf-8")) as Record<string, unknown>
  const reviews = (raw.reviews ?? {}) as Record<string, unknown>

  if (reviews.amazon_rating === rating && reviews.amazon_review_count === reviewCount) return false

  reviews.amazon_rating = rating
  reviews.amazon_review_count = reviewCount
  raw.reviews = reviews
  fs.writeFileSync(file, yaml.dump(raw, { lineWidth: 120 }))
  return true
}

async function main() {
  // Check Camofox is running
  const health = await fetch(`${CAMOFOX}/health`).then((r) => r.json()).catch(() => null) as { ok?: boolean } | null
  if (!health?.ok) {
    console.error("Camofox not running at http://localhost:9377")
    process.exit(1)
  }

  const products = fs
    .readdirSync(PRODUCTS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => yaml.load(fs.readFileSync(path.join(PRODUCTS_DIR, f), "utf-8")) as Product)
    .filter((p) => p.amazon_asin)

  console.log(`\nScraping ratings for ${products.length} products via Camofox...\n`)

  const tabId = await openTab("https://www.amazon.com")
  await new Promise((r) => setTimeout(r, 3000))

  // Handle initial interstitial if any
  const initSnap = await getSnapshot(tabId)
  if (initSnap.includes("Continue shopping")) {
    const ref = initSnap.match(/button "Continue shopping" \[(\w+)\]/)
    if (ref) await camofox("POST", `/tabs/${tabId}/click`, { ref: ref[1] })
    await new Promise((r) => setTimeout(r, 3000))
  }

  let updated = 0
  let failed = 0

  for (const product of products) {
    console.log(`→ ${product.name}`)

    await navigateTo(tabId, `https://www.amazon.com/dp/${product.amazon_asin}`)

    let snap = await getSnapshot(tabId)
    snap = await dismissInterstitial(tabId, snap)

    const result = parseRating(snap, product.amazon_asin!)
    if (result) {
      const changed = updateYamlRating(product.slug, result.rating, result.reviewCount)
      console.log(`  ${result.rating}★ (${result.reviewCount.toLocaleString()} reviews)${changed ? " [updated]" : " [no change]"}`)
      if (changed) updated++
    } else {
      console.warn(`  [fail] no rating found (snap length: ${snap.length})`)
      failed++
    }

    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500))
  }

  await closeTab(tabId)
  console.log(`\nDone. ${updated} updated, ${failed} failed.`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
