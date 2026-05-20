# Product Requirements Document
## Gaming Dock Compare — Daily-Updated US Market Comparison Site

**Version:** 0.1  
**Date:** 2026-05-20  
**Owner:** BRZDer

---

## 1. Goal

Build a daily-updated, SEO-optimized website that helps US gamers compare gaming docking stations across price, specs, reviews, and value. Long-term monetization via affiliate links (Amazon Associates, etc.).

---

## 2. Target Users

- US PC/console gamers shopping for a docking station
- Laptop users (especially gaming laptop owners) needing expansion
- Search intent: "best gaming dock 2026", "thunderbolt 4 dock comparison", "gaming dock under $200"

---

## 3. Feature Priority

| Priority | Feature | Description |
|----------|---------|-------------|
| P0 | Price tracking | Current price + 30/90-day history per product |
| P1 | Spec comparison | Side-by-side table: ports, power delivery, protocols, display output |
| P2 | Review aggregation | Score from Amazon, RTINGS, Tom's Hardware, Wirecutter, Reddit sentiment |
| P3 | Value/CP ranking | Score = (specs score + review score) / price |
| P4 | Affiliate links | Amazon Associates + B&H affiliate |

---

## 4. Data Sources

| Source | Data Type | Method |
|--------|-----------|--------|
| Amazon US | Price, user reviews, rating | Amazon PA API |
| B&H Photo | Price, specs | Scraper (Playwright) |
| Newegg | Price | Scraper |
| Manufacturer pages | Official specs | Scraper / manual YAML |
| RTINGS.com | Expert review scores | Scraper |
| Tom's Hardware | Expert review | Scraper (article metadata) |
| Wirecutter / NYT | Editor's pick flag | Scraper |
| Reddit (r/SuggestALaptop, r/buildapc) | Sentiment | Reddit API |

---

## 5. Update Schedule

- **Default**: GitHub Actions cron `0 6 * * *` (6 AM UTC daily)
- **Price scraper**: runs daily, writes to `data/prices/{slug}/{date}.json`
- **Spec scraper**: runs weekly (specs change rarely)
- **Review scraper**: runs daily
- **Trigger**: Vercel webhook redeploys after scraper completes

---

## 6. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 15 (App Router) | ISR, SEO, API routes |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent UI |
| Data storage | YAML files (specs) + JSON files (prices) in repo | No DB cost, git history = free audit log |
| Price history | Upstash Redis | Persistent time-series outside git |
| Deployment | Vercel | Zero-config, ISR, preview deploys |
| Scraping | Playwright (headless) in GitHub Actions | Handles JS-rendered pages |
| Charts | Recharts | Price history visualization |

---

## 7. Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Home: top picks, recently updated, featured comparisons |
| `/compare` | Multi-select side-by-side comparison tool |
| `/products/[slug]` | Individual product page: price history, full specs, all reviews |
| `/categories/[category]` | Filtered list (thunderbolt-4, usb-c, budget, etc.) |
| `/best-picks` | Editor/algorithm-ranked list by use case |

---

## 8. Data Schema (Product)

```yaml
# data/products/caldigit-ts4.yaml
slug: caldigit-ts4
name: CalDigit TS4
brand: CalDigit
category: thunderbolt-4
msrp_usd: 379
amazon_asin: B09GK8LBWS
bh_sku: CATS4
specs:
  ports:
    usb_a: 5
    usb_c: 3
    thunderbolt: 2
    displayport: 1
    hdmi: 1
    ethernet: 1
    sd_card: 1
    audio: 2
  power_delivery_w: 98
  max_displays: 2
  host_interface: thunderbolt-4
  dimensions_mm: [190, 76, 40]
  weight_g: 560
reviews:
  amazon_asin: B09GK8LBWS
  rtings_url: https://www.rtings.com/...
  tomshardware_url: https://www.tomshardware.com/...
```

---

## 9. MVP Scope (v0.1)

- [ ] 20 seed products (manually curated YAML)
- [ ] Price scraper (Amazon PA API or Playwright fallback)
- [ ] Product list page with sort/filter by price, brand, category
- [ ] Individual product page with price history chart
- [ ] Side-by-side comparison (up to 4 products)
- [ ] GitHub Actions daily cron
- [ ] Vercel deploy with ISR revalidate = 86400s
- [ ] Basic SEO: sitemap, robots.txt, meta tags

---

## 10. Out of Scope (v0.1)

- User accounts / saved comparisons
- Real-time price alerts
- Mobile app
- Non-US markets
- Console docking stations (Nintendo Switch, Steam Deck — separate product type)
