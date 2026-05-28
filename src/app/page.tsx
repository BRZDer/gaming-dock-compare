import { Suspense } from "react"
import { loadAllProductsWithPrices } from "@/lib/data/loader"
import { HomePageClient } from "@/components/products/HomePageClient"

export const revalidate = 86400

export default function HomePage() {
  const products = loadAllProductsWithPrices()
  const brands = [...new Set(products.map((p) => p.brand))].sort()

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gaming Dock Compare</h1>
        <p className="text-muted-foreground mt-2">
          Daily-updated prices, specs, and reviews for the best gaming docking stations on the US market.
        </p>
      </div>

      <Suspense>
        <HomePageClient products={products} brands={brands} />
      </Suspense>
    </main>
  )
}
