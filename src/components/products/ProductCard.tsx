"use client"

import { ProductWithPrices } from "@/types/product"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getBandwidth, getMaxResolution, getInterfaceLabel } from "@/lib/specs"
import { useCompare } from "@/components/compare/CompareProvider"

const CARD_SPEC_ROWS: { key: string; label: string }[] = [
  { key: "size",       label: "Size" },
  { key: "weight",     label: "Weight" },
  { key: "adapter",    label: "Adapter" },
  { key: "interface",  label: "Upstream Interface" },
  { key: "hdmi",       label: "HDMI" },
  { key: "dp",         label: "DP" },
  { key: "vga",        label: "VGA" },
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

const DEFAULT_VISIBLE = new Set(["adapter", "interface", "tb", "usba", "usbc_data", "eth"])

interface Props {
  product: ProductWithPrices
  visibleSpecs?: Set<string>
}

export function ProductCard({ product, visibleSpecs }: Props) {
  const { name, brand, category, specs, current_price } = product
  const { selected, toggle } = useCompare()
  const isSelected = selected.includes(product.slug)

  const totalPorts =
    (specs.ports.usb_a ?? 0) +
    (specs.ports.usb_c_data ?? 0) +
    (specs.ports.usb_c_display ?? 0) +
    (specs.ports.thunderbolt ?? 0) +
    (specs.ports.hdmi ?? 0) +
    (specs.ports.displayport ?? 0)

  const effective = visibleSpecs ?? DEFAULT_VISIBLE

  const specValues: Record<string, string | number> = {
    interface:  getInterfaceLabel(specs.host_interface),
    speed:      getBandwidth(specs),
    power:      `${specs.power_delivery_w}W`,
    ports:      totalPorts,
    displays:   `${specs.max_displays} (${getMaxResolution(specs)})`,
    res:        specs.display_resolution ?? "—",
    hdmi:       specs.ports.hdmi ?? 0,
    dp:         specs.ports.displayport ?? 0,
    vga:        specs.ports.vga ?? 0,
    tb:         specs.ports.thunderbolt ?? 0,
    usbc_disp:  specs.ports.usb_c_display ?? 0,
    usba:       specs.ports.usb_a ?? 0,
    usbc_data:  (() => {
      const count = specs.ports.usb_c_data ?? 0
      if (specs.ports.usb_c_data_detail) return `${count} (${specs.ports.usb_c_data_detail})`
      return count
    })(),
    eth:        specs.ports.ethernet ? "Yes" : "No",
    audio:      specs.ports.audio ? `${specs.ports.audio}` : "No",
    sd:         specs.ports.sd_card ? "Yes" : "No",
    microsd:    specs.ports.microsd ? "Yes" : "No",
    klock:      specs.kensington_lock ? "Yes" : "No",
    power_in:   specs.power_in ?? "—",
    adapter:    specs.power_input_w ? `${specs.power_input_w}W` : "Bus-powered",
    pwrbtn:     specs.power_button ? "Yes" : "No",
    leds:       specs.indicator_leds ? "Yes" : "No",
    compat:     specs.compatible_system ?? "—",
    os:         specs.supported_os ?? "—",
    weight:     specs.weight_g ? `${specs.weight_g}g` : "—",
    size:       specs.dimensions_mm ? `${specs.dimensions_mm[0]}×${specs.dimensions_mm[1]}×${specs.dimensions_mm[2]} mm` : "—",
  }

  const visibleRows = CARD_SPEC_ROWS.filter((r) => effective.has(r.key) && specValues[r.key] !== 0)

  return (
    <Card
      className={`flex flex-col h-full relative transition-all ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => toggle(product.slug)}
        aria-label={isSelected ? `Deselect ${name}` : `Select ${name} for comparison`}
        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected
            ? "bg-primary border-primary text-primary-foreground"
            : "bg-background border-input hover:border-primary"
        }`}
      >
        {isSelected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <CardHeader className="pb-2 pl-9">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{name}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {getInterfaceLabel(category)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{brand}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        <div className="text-2xl font-bold">
          {current_price ? (
            <>${current_price.price_usd.toFixed(2)}</>
          ) : (
            <span className="text-muted-foreground text-lg">${product.msrp_usd} MSRP</span>
          )}
        </div>

        {visibleRows.length > 0 && (
          <div className="grid grid-cols-2 gap-1 text-sm">
            {visibleRows.map((row) => (
              <>
                <span key={`${row.key}-label`} className="text-muted-foreground">{row.label}</span>
                <span key={`${row.key}-value`} className="font-medium">{specValues[row.key]}</span>
              </>
            ))}
          </div>
        )}

        {product.reviews?.amazon_rating !== undefined && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-amber-400">{"★".repeat(Math.round(product.reviews.amazon_rating))}{"☆".repeat(5 - Math.round(product.reviews.amazon_rating))}</span>
            <span className="font-medium">{product.reviews.amazon_rating.toFixed(1)}</span>
            {product.reviews.amazon_review_count !== undefined && (
              <span className="text-muted-foreground">({product.reviews.amazon_review_count.toLocaleString()})</span>
            )}
          </div>
        )}

        {(product.reviews?.tomshardware_url || product.reviews?.pcworld_url) && (
          <div className="flex gap-2 flex-wrap text-xs">
            {product.reviews.tomshardware_url && (
              <a href={product.reviews.tomshardware_url} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground underline underline-offset-2">
                Tom&apos;s Hardware
              </a>
            )}
            {product.reviews.pcworld_url && (
              <a href={product.reviews.pcworld_url} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground underline underline-offset-2">
                PCWorld
              </a>
            )}
          </div>
        )}

        {product.reviews?.wirecutter_pick && (
          <Badge className="w-fit bg-green-600 hover:bg-green-700">Wirecutter Pick</Badge>
        )}

        <div className="mt-auto flex gap-2">
          <a
            href={`/products/${product.slug}`}
            className="flex-1 inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Details
          </a>
          {current_price?.affiliate_url && (
            <a
              href={current_price.affiliate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Buy
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
