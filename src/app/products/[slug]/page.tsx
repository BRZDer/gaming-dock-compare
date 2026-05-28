import { notFound } from "next/navigation"
import { loadAllProducts, loadProductWithPrices } from "@/lib/data/loader"
import { PriceHistoryChart } from "@/components/charts/PriceHistoryChart"
import { Badge } from "@/components/ui/badge"
import { getBandwidth, getMaxResolution, getInterfaceLabel } from "@/lib/specs"
import type { Metadata } from "next"

export const revalidate = 86400

export async function generateStaticParams() {
  const products = loadAllProducts()
  return products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = loadProductWithPrices(slug)
  if (!product) return {}
  const price = product.current_price?.price_usd ?? product.msrp_usd
  return {
    title: `${product.name} Review & Price — Gaming Dock Compare`,
    description: `${product.name} by ${product.brand}. Current price: $${price}. ${product.specs.ports.thunderbolt ?? 0} Thunderbolt ports, ${product.specs.power_delivery_w}W charging, up to ${product.specs.max_displays} displays.`,
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = loadProductWithPrices(slug)
  if (!product) notFound()

  const { name, brand, category, specs, reviews, current_price, price_history, msrp_usd } = product
  const price = current_price?.price_usd ?? msrp_usd

  const specRows: { label: string; value: string | number }[] = [
    { label: "Size",               value: specs.dimensions_mm ? `${specs.dimensions_mm[0]} × ${specs.dimensions_mm[1]} × ${specs.dimensions_mm[2]} mm` : "—" },
    { label: "Weight",             value: specs.weight_g ? `${specs.weight_g}g` : "—" },
    { label: "Power Adapter",      value: specs.power_input_w ? `${specs.power_input_w}W included` : "Bus-powered" },
    { label: "Upstream Interface", value: getInterfaceLabel(specs.host_interface) },
    { label: "Transfer Speed",     value: getBandwidth(specs) },
    { label: "HDMI",               value: specs.ports.hdmi ?? 0 },
    { label: "DisplayPort",        value: specs.ports.displayport ?? 0 },
    { label: "VGA",                value: specs.ports.vga ?? 0 },
    { label: "USB-C (Display)",    value: specs.ports.usb_c_display ?? 0 },
    { label: "Thunderbolt",        value: specs.ports.thunderbolt ?? 0 },
    { label: "Display Resolution", value: specs.display_resolution ?? "—" },
    { label: "Max Displays",       value: `${specs.max_displays} (${getMaxResolution(specs)})` },
    { label: "Power Delivery",     value: `${specs.power_delivery_w}W` },
    { label: "USB-A",              value: specs.ports.usb_a ?? 0 },
    { label: "USB-C (Data)",       value: (() => {
      const count = specs.ports.usb_c_data ?? 0
      if (specs.ports.usb_c_data_detail) return `${count} (${specs.ports.usb_c_data_detail})`
      return count
    })() },
    { label: "RJ45",               value: specs.ports.ethernet ? "Yes" : "No" },
    { label: "Audio Jack",         value: specs.ports.audio ? `${specs.ports.audio}` : "No" },
    { label: "SD Card",            value: specs.ports.sd_card ? "Yes" : "No" },
    { label: "microSD",            value: specs.ports.microsd ? "Yes" : "No" },
    { label: "Kensington Lock",    value: specs.kensington_lock ? "Yes" : "No" },
    { label: "Power In",           value: specs.power_in ?? "—" },
    { label: "Power Button",       value: specs.power_button ? "Yes" : "No" },
    { label: "Indicator LEDs",     value: specs.indicator_leds ? "Yes" : "No" },
    { label: "Compatible System",  value: specs.compatible_system ?? "—" },
    { label: "Supported OS",       value: specs.supported_os ?? "—" },
  ]

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <nav className="text-sm text-muted-foreground mb-6">
        <a href="/" className="hover:underline">Home</a>
        <span className="mx-2">/</span>
        <span>{name}</span>
      </nav>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left: price + buy */}
        <div className="md:col-span-1 space-y-4">
          <div>
            <Badge variant="secondary" className="mb-2">
              {getInterfaceLabel(category)}
            </Badge>
            <h1 className="text-2xl font-bold leading-tight">{name}</h1>
            <p className="text-muted-foreground">{brand}</p>
          </div>

          <div className="text-4xl font-bold">${price.toFixed(2)}</div>
          {!current_price && (
            <p className="text-xs text-muted-foreground">MSRP — live price updates daily</p>
          )}

          {current_price?.affiliate_url && (
            <a
              href={current_price.affiliate_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block w-full text-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {current_price.source === "bestbuy" ? "Buy on Best Buy →"
                : current_price.source === "manual" ? "Buy →"
                : "Buy on Amazon →"}
            </a>
          )}

          {reviews?.wirecutter_pick && (
            <Badge className="bg-green-600 hover:bg-green-700">Wirecutter Pick</Badge>
          )}
        </div>

        {/* Right: specs + chart */}
        <div className="md:col-span-2 space-y-6">
          <section>
            <h2 className="font-semibold mb-3">Price History</h2>
            <PriceHistoryChart history={price_history} />
          </section>

          <section>
            <h2 className="font-semibold mb-3">Specifications</h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {specRows.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? "border-b" : "border-b bg-muted/30"}>
                      <td className="px-4 py-2.5 text-muted-foreground w-1/2">{row.label}</td>
                      <td className="px-4 py-2.5 font-medium">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
