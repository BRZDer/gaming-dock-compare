"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { ProductWithPrices } from "@/types/product"
import { getInterfaceLabel } from "@/lib/specs"

const SPEC_ROWS: { key: string; label: string; getValue: (p: ProductWithPrices) => string | number }[] = [
  { key: "price",     label: "Price",             getValue: (p) => p.current_price?.price_usd ?? p.msrp_usd },
  { key: "interface", label: "Upstream Interface", getValue: (p) => getInterfaceLabel(p.specs.host_interface) },
  { key: "power",     label: "Power Delivery",    getValue: (p) => `${p.specs.power_delivery_w}W` },
  { key: "displays",  label: "Max Displays",      getValue: (p) => p.specs.max_displays },
  { key: "res",       label: "Display Resolution", getValue: (p) => p.specs.display_resolution ?? "—" },
  { key: "hdmi",      label: "HDMI",              getValue: (p) => p.specs.ports.hdmi ?? 0 },
  { key: "dp",        label: "DisplayPort",       getValue: (p) => p.specs.ports.displayport ?? 0 },
  { key: "vga",       label: "VGA",               getValue: (p) => p.specs.ports.vga ?? 0 },
  { key: "tb",        label: "Thunderbolt",        getValue: (p) => p.specs.ports.thunderbolt ?? 0 },
  { key: "usbc_disp", label: "USB-C (Display)",   getValue: (p) => p.specs.ports.usb_c_display ?? 0 },
  { key: "usba",      label: "USB-A",             getValue: (p) => p.specs.ports.usb_a ?? 0 },
  { key: "usbc_data", label: "USB-C (Data)",      getValue: (p) => {
    const count = p.specs.ports.usb_c_data ?? 0
    if (count >= 2 && p.specs.ports.usb_c_data_detail) return `${count} (${p.specs.ports.usb_c_data_detail})`
    return count
  }},
  { key: "eth",       label: "RJ45",              getValue: (p) => p.specs.ports.ethernet ? "Yes" : "No" },
  { key: "audio",     label: "Audio Jack",        getValue: (p) => p.specs.ports.audio ? `${p.specs.ports.audio}` : "No" },
  { key: "sd",        label: "SD Card",           getValue: (p) => p.specs.ports.sd_card ? "Yes" : "No" },
  { key: "microsd",   label: "microSD",           getValue: (p) => p.specs.ports.microsd ? "Yes" : "No" },
  { key: "klock",     label: "Kensington Lock",   getValue: (p) => p.specs.kensington_lock ? "Yes" : "No" },
  { key: "power_in",  label: "Power In",          getValue: (p) => p.specs.power_in ?? "—" },
  { key: "adapter",   label: "Power Adapter",     getValue: (p) => p.specs.power_input_w ? `${p.specs.power_input_w}W` : "Bus-powered" },
  { key: "pwrbtn",    label: "Power Button",      getValue: (p) => p.specs.power_button ? "Yes" : "No" },
  { key: "leds",      label: "Indicator LEDs",    getValue: (p) => p.specs.indicator_leds ? "Yes" : "No" },
  { key: "compat",    label: "Compatible System", getValue: (p) => p.specs.compatible_system ?? "—" },
  { key: "os",        label: "Supported OS",      getValue: (p) => p.specs.supported_os ?? "—" },
  { key: "weight",    label: "Weight",            getValue: (p) => p.specs.weight_g ? `${p.specs.weight_g}g` : "—" },
  { key: "size",      label: "Size",              getValue: (p) => p.specs.dimensions_mm ? `${p.specs.dimensions_mm[0]}×${p.specs.dimensions_mm[1]}×${p.specs.dimensions_mm[2]} mm` : "—" },
]

const ALL_KEYS = SPEC_ROWS.map((r) => r.key)

const HIGHER_IS_BETTER = new Set(["power", "displays", "tb", "usba", "usbc_disp", "usbc_data", "hdmi", "dp"])
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
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set(ALL_KEYS))

  const selectedSlugs = useMemo(
    () => (params.get("products") ?? "").split(",").filter(Boolean),
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
    if (selectedSlugs.includes(slug)) return
    updateSelected([...selectedSlugs, slug])
  }

  const removeProduct = (slug: string) => updateSelected(selectedSlugs.filter((s) => s !== slug))

  const available = products.filter((p) => !selectedSlugs.includes(p.slug))

  const toggleKey = (key: string) =>
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const allChecked = visibleKeys.size === ALL_KEYS.length
  const toggleAll = () => setVisibleKeys(allChecked ? new Set() : new Set(ALL_KEYS))

  const visibleRows = SPEC_ROWS.filter((r) => visibleKeys.has(r.key))

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Compare Docking Stations</h1>
        <p className="text-muted-foreground mt-1">Select products to compare side by side.</p>
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
        {available.length > 0 && (
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

      <div className="flex gap-4 items-start">
        {/* Spec filter sidebar */}
        <div className="w-44 flex-shrink-0">
          <div className="sticky top-4 border rounded-lg p-3 bg-background">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Specs</span>
              <button
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {allChecked ? "None" : "All"}
              </button>
            </div>
            <div className="space-y-1">
              {SPEC_ROWS.map((row) => (
                <label key={row.key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={visibleKeys.has(row.key)}
                    onChange={() => toggleKey(row.key)}
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

        {/* Compare area */}
        <div className="flex-1 min-w-0">
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
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={selected.length + 1} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        No specs selected. Check some rows on the left.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row, ri) => {
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
                    })
                  )}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                Green = best value in that category.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
