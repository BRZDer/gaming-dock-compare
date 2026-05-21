"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "thunderbolt-4", label: "Thunderbolt 4" },
  { value: "thunderbolt-3", label: "Thunderbolt 3" },
  { value: "usb-c", label: "USB-C" },
]

const SORT_OPTIONS = [
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "power-desc", label: "Power Delivery" },
  { value: "ports-desc", label: "Most Ports" },
  { value: "displays-desc", label: "Most Displays" },
]

export function ProductFilters({ brands }: { brands: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [router, pathname, params]
  )

  const category = params.get("category") ?? ""
  const brand = params.get("brand") ?? ""
  const sort = params.get("sort") ?? "price-asc"
  const maxPrice = params.get("maxPrice") ?? ""

  return (
    <div className="flex flex-wrap gap-3 items-end mb-6 p-4 rounded-lg border bg-muted/30">
      {/* Category */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Interface</label>
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => update("category", c.value)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                category === c.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background hover:bg-accent"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Brand</label>
        <select
          value={brand}
          onChange={(e) => update("brand", e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Max price */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Max Price</label>
        <select
          value={maxPrice}
          onChange={(e) => update("maxPrice", e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">Any Price</option>
          <option value="100">Under $100</option>
          <option value="200">Under $200</option>
          <option value="300">Under $300</option>
          <option value="400">Under $400</option>
        </select>
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-1 ml-auto">
        <label className="text-xs font-medium text-muted-foreground">Sort By</label>
        <select
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
