"use client"

import { useState } from "react"
import { Suspense } from "react"
import { ProductWithPrices } from "@/types/product"
import { ProductFilters } from "@/components/filters/ProductFilters"
import { ProductGrid } from "./ProductGrid"

export const CARD_SPEC_ROWS: { key: string; label: string }[] = [
  { key: "interface",  label: "Interface" },
  { key: "speed",      label: "Transfer Speed" },
  { key: "power",      label: "Power Delivery" },
  { key: "ports",      label: "Total Ports" },
  { key: "displays",   label: "Max Displays" },
  { key: "hdmi",       label: "HDMI" },
  { key: "dp",         label: "DisplayPort" },
  { key: "tb",         label: "Thunderbolt" },
  { key: "usba",       label: "USB-A" },
  { key: "usbc_data",  label: "USB-C (Data)" },
  { key: "usbc_disp",  label: "USB-C (Display)" },
  { key: "eth",        label: "Ethernet" },
  { key: "audio",      label: "Audio Jack" },
  { key: "sd",         label: "SD Card" },
  { key: "microsd",    label: "microSD" },
  { key: "klock",      label: "Kensington Lock" },
  { key: "weight",     label: "Weight" },
]

const ALL_KEYS = CARD_SPEC_ROWS.map((r) => r.key)
const DEFAULT_VISIBLE = new Set(["interface", "speed", "power", "ports", "displays"])

interface Props {
  products: ProductWithPrices[]
  brands: string[]
}

export function HomePageClient({ products, brands }: Props) {
  const [visibleSpecs, setVisibleSpecs] = useState<Set<string>>(DEFAULT_VISIBLE)

  const allChecked = visibleSpecs.size === ALL_KEYS.length

  const toggleSpec = (key: string) =>
    setVisibleSpecs((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const toggleAll = () =>
    setVisibleSpecs(allChecked ? new Set() : new Set(ALL_KEYS))

  return (
    <div className="flex gap-6 items-start">
      {/* Spec filter sidebar */}
      <div className="w-44 flex-shrink-0">
        <div className="sticky top-4 border rounded-lg p-3 bg-background">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Specs</span>
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {allChecked ? "None" : "All"}
            </button>
          </div>
          <div className="space-y-1">
            {CARD_SPEC_ROWS.map((row) => (
              <label key={row.key} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={visibleSpecs.has(row.key)}
                  onChange={() => toggleSpec(row.key)}
                  className="h-3.5 w-3.5 rounded border-input accent-primary"
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground leading-tight">
                  {row.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <Suspense>
          <ProductFilters brands={brands} />
          <p className="text-sm text-muted-foreground mb-4">{products.length} products</p>
          <ProductGrid products={products} visibleSpecs={visibleSpecs} />
        </Suspense>
      </div>
    </div>
  )
}
