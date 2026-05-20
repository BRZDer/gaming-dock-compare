import { loadAllProductsWithPrices } from "@/lib/data/loader"
import { ProductCard } from "@/components/products/ProductCard"

export const revalidate = 86400

export default function HomePage() {
  const products = loadAllProductsWithPrices().sort(
    (a, b) => (a.current_price?.price_usd ?? a.msrp_usd) - (b.current_price?.price_usd ?? b.msrp_usd)
  )

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gaming Dock Compare</h1>
        <p className="text-muted-foreground mt-2">
          Daily-updated prices, specs, and reviews for the best gaming docking stations on the US market.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{products.length} products</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </main>
  )
}
