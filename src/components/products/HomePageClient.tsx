"use client"

import { useState } from "react"
import { Suspense } from "react"
import { ProductWithPrices } from "@/types/product"
import { ProductFilters } from "@/components/filters/ProductFilters"
import { ProductGrid } from "./ProductGrid"

export const CARD_SPEC_ROWS: { key: string; label: string }[] = [
  { key: "size",       label: "Size" },
  { key: "weight",     label: "Weight" },
  { key: "adapter",    label: "Adapter" },
  { key: "interface",  label: "Upstream Interface" },
  { key: "hdmi",       label: "HDMI" },
  { key: "dp",         label: "DP" },
{ key: "usbc_disp",  label: "USB-C (Display)" },
  { key: "tb",         label: "Thunderbolt" },
  { key: "res",        label: "Display Resolution" },
  { key: "usba",       label: "USB-A" },
  { key: "usbc_data",  label: "USB-C (Data)" },
  { key: "eth",        label: "RJ45" },
  { key: "audio",      label: "Audio Jack" },
  { key: "sd",         label: "SD Card" },
  { key: "microsd",    label: "microSD" },
  { key: "klock",      label: "Kensington Lock" },
  { key: "power_in",   label: "Power In" },
  { key: "pwrbtn",     label: "Power Button" },
  { key: "leds",       label: "Indicator LEDs" },
  { key: "compat",     label: "Compatible System" },
  { key: "os",         label: "Supported OS" },
]

const ALL_KEYS = CARD_SPEC_ROWS.map((r) => r.key)
const DEFAULT_VISIBLE = new Set(["adapter", "interface", "tb", "usba", "usbc_data", "eth"])

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
    <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "11rem 1fr" }}>
      {/* Spec filter sidebar */}
      <div>
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
      <div className="min-w-0">
        <Suspense fallback={<div className="min-h-[800px]" />}>
          <ProductFilters brands={brands} />
          <p className="text-sm text-muted-foreground mb-4">{products.length} products</p>
          <ProductGrid products={products} visibleSpecs={visibleSpecs} />
        </Suspense>
      </div>
    </div>
  )
}
