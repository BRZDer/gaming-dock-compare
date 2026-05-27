"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"
import { ProductWithPrices } from "@/types/product"
import { getInterfaceLabel } from "@/lib/specs"

const MAX_COMPARE = 4

const SPEC_ROWS: { key: string; label: string; getValue: (p: ProductWithPrices) => string | number }[] = [
  { key: "price",     label: "Price",           getValue: (p) => p.current_price?.price_usd ?? p.msrp_usd },
  { key: "interface", label: "Interface",        getValue: (p) => getInterfaceLabel(p.specs.host_interface) },
  { key: "power",     label: "Power Delivery",   getValue: (p) => `${p.specs.power_delivery_w}W` },
  { key: "displays",  label: "Max Displays",     getValue: (p) => p.specs.max_displays },
  { key: "tb",        label: "Thunderbolt Ports", getValue: (p) => p.specs.ports.thunderbolt ?? 0 },
  { key: "usba",      label: "USB-A Ports",      getValue: (p) => p.specs.ports.usb_a ?? 0 },
  { key: "usbc",      label: "USB-C Ports",      getValue: (p) => p.specs.ports.usb_c ?? 0 },
  { key: "hdmi",      label: "HDMI",             getValue: (p) => p.specs.ports.hdmi ?? 0 },
  { key: "dp",        label: "DisplayPort",      getValue: (p) => p.specs.ports.displayport ?? 0 },
  { key: "eth",       label: "Ethernet",         getValue: (p) => p.specs.ports.ethernet ? "Yes" : "No" },
  { key: "sd",        label: "SD Card",          getValue: (p) => p.specs.ports.sd_card ? "Yes" : "No" },
  { key: "weight",    label: "Weight",           getValue: (p) => p.specs.weight_g ? `${p.specs.weight_g}g` : "—" },
]

// Rows where higher = better (for highlight logic)
const HIGHER_IS_BETTER = new Set(["power", "displays", "tb", "usba", "usbc", "hdmi", "dp"])
// Rows where lower = better
const LOWER_IS_BETTER = new Set(["price"])

function getBestIndex(rows: (string | number)[], key: string): number {
  const nums = rows.map((v) => typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.]/g, "")))
  if (nums.some(isNaN)) return -1
  if (HIGHER_IS_BETTER.has(key)) return nums.indexOf(Math.max(...nums))
  if (LOWER_IS_BETTER.has(key)) return nums.indexOf(Math.min(...nums))
  return -1
}

interface Props {
  products: ProductWithPrices[]
}

export function CompareClient({ products }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const selectedSlugs = useMemo(
    () => (params.get("products") ?? "").split(",").filter(Boolean).slice(0, MAX_COMPARE),
    [params]
  )

  const selected = useMemo(
    () => selectedSlugs.map((s) => products.find((p) => p.slug === s)).filter(Boolean) as ProductWithPrices[],
    [selectedSlugs, products]
  )

  const updateSelected = useCallback(
    (slugs: string[]) => {
      const next = new URLSearchParams(params.toString())
      if (slugs.length) next.set("products", slugs.join(","))
      else next.delete("products")
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [router, pathname, params]
  )

  const addProduct = (slug: string) => {
    if (selectedSlugs.includes(slug) || selectedSlugs.length >= MAX_COMPARE) return
    updateSelected([...selectedSlugs, slug])
  }

  const removeProduct = (slug: string) => updateSelected(selectedSlugs.filter((s) => s !== slug))

  const available = products.filter((p) => !selectedSlugs.includes(p.slug))

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Compare Docking Stations</h1>
        <p className="text-muted-foreground mt-1">Select up to 4 products to compare side by side.</p>
      </div>

      {/* Product selector */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {selected.map((p) => (
          <span
            key={p.slug}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium"
          >
            {p.name}
            <button
              onClick={() => removeProduct(p.slug)}
              className="hover:opacity-70 transition-opacity text-base leading-none"
              aria-label={`Remove ${p.name}`}
            >
              ×
            </button>
          </span>
        ))}
        {selected.length < MAX_COMPARE && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) addProduct(e.target.value) }}
            className="h-9 rounded-full border border-dashed border-input bg-background px-3 text-sm"
          >
            <option value="">+ Add product…</option>
            {available.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {selected.length < 2 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed rounded-lg">
          Select at least 2 products to compare.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-36">Spec</th>
                {selected.map((p) => (
                  <th key={p.slug} className="px-4 py-3 text-left min-w-[180px]">
                    <a href={`/products/${p.slug}`} className="font-semibold hover:underline">
                      {p.name}
                    </a>
                    <p className="text-muted-foreground font-normal text-xs">{p.brand}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPEC_ROWS.map((row, ri) => {
                const values = selected.map((p) => row.getValue(p))
                const bestIdx = getBestIndex(values, row.key)
                return (
                  <tr key={row.key} className={ri % 2 === 0 ? "border-b bg-muted/20" : "border-b"}>
                    <td className="px-4 py-3 text-muted-foreground font-medium">{row.label}</td>
                    {values.map((v, vi) => (
                      <td
                        key={vi}
                        className={`px-4 py-3 font-medium capitalize ${
                          vi === bestIdx ? "text-green-600 dark:text-green-400" : ""
                        }`}
                      >
                        {row.key === "price" ? `$${Number(v).toFixed(2)}` : v}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-2">
            Green = best value in that category.
          </p>
        </div>
      )}
    </main>
  )
}
