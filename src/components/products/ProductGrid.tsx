"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { ProductWithPrices } from "@/types/product"
import { ProductCard } from "./ProductCard"

interface Props {
  products: ProductWithPrices[]
  visibleSpecs?: Set<string>
}

export function ProductGrid({ products, visibleSpecs }: Props) {
  const params = useSearchParams()

  const filtered = useMemo(() => {
    const category = params.get("category") ?? ""
    const brand = params.get("brand") ?? ""
    const maxPrice = params.get("maxPrice") ? parseInt(params.get("maxPrice")!) : null
    const sort = params.get("sort") ?? "price-asc"

    let result = products.filter((p) => {
      if (category && p.category !== category) return false
      if (brand && p.brand !== brand) return false
      const price = p.current_price?.price_usd ?? p.msrp_usd
      if (maxPrice && price > maxPrice) return false
      return true
    })

    result.sort((a, b) => {
      const priceA = a.current_price?.price_usd ?? a.msrp_usd
      const priceB = b.current_price?.price_usd ?? b.msrp_usd
      switch (sort) {
        case "price-asc":   return priceA - priceB
        case "price-desc":  return priceB - priceA
        case "power-desc":  return b.specs.power_delivery_w - a.specs.power_delivery_w
        case "ports-desc": {
          const totalA = Object.values(a.specs.ports).reduce((s, v) => s + (v ?? 0), 0)
          const totalB = Object.values(b.specs.ports).reduce((s, v) => s + (v ?? 0), 0)
          return totalB - totalA
        }
        case "displays-desc": return b.specs.max_displays - a.specs.max_displays
        default: return priceA - priceB
      }
    })

    return result
  }, [products, params])

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No products match your filters.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filtered.map((p) => (
        <ProductCard key={p.slug} product={p} visibleSpecs={visibleSpecs} />
      ))}
    </div>
  )
}
