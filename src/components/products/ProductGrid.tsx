"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { ProductWithPrices } from "@/types/product"
import { ProductCard } from "./ProductCard"

interface Props {
  products: ProductWithPrices[]
  visibleSpecs?: Set<string>
}

// Maps spec sidebar keys to a function that returns whether a product "has" that spec
const SPEC_FILTER: Record<string, (p: ProductWithPrices) => boolean> = {
  hdmi:       (p) => (p.specs.ports.hdmi ?? 0) > 0,
  dp:         (p) => (p.specs.ports.displayport ?? 0) > 0,
  vga:        (p) => (p.specs.ports.vga ?? 0) > 0,
  tb:         (p) => (p.specs.ports.thunderbolt ?? 0) > 0,
  usbc_disp:  (p) => (p.specs.ports.usb_c_display ?? 0) > 0,
  usba:       (p) => (p.specs.ports.usb_a ?? 0) > 0,
  usbc_data:  (p) => (p.specs.ports.usb_c_data ?? 0) > 0,
  sd:         (p) => (p.specs.ports.sd_card ?? 0) > 0,
  microsd:    (p) => (p.specs.ports.microsd ?? 0) > 0,
  audio:      (p) => (p.specs.ports.audio ?? 0) > 0,
  eth:        (p) => !!p.specs.ports.ethernet,
  klock:      (p) => !!p.specs.kensington_lock,
  pwrbtn:     (p) => !!p.specs.power_button,
  leds:       (p) => !!p.specs.indicator_leds,
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
      // Left sidebar spec filter — intersection with top filters
      if (visibleSpecs) {
        for (const key of visibleSpecs) {
          const check = SPEC_FILTER[key]
          if (check && !check(p)) return false
        }
      }
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
          const totalA = Object.values(a.specs.ports).reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0)
          const totalB = Object.values(b.specs.ports).reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0)
          return totalB - totalA
        }
        case "displays-desc": return b.specs.max_displays - a.specs.max_displays
        default: return priceA - priceB
      }
    })

    return result
  }, [products, params, visibleSpecs])

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
