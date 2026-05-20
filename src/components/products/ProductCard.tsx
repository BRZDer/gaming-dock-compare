import { ProductWithPrices } from "@/types/product"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Props {
  product: ProductWithPrices
}

export function ProductCard({ product }: Props) {
  const { name, brand, category, specs, current_price } = product
  const totalPorts =
    (specs.ports.usb_a ?? 0) +
    (specs.ports.usb_c ?? 0) +
    (specs.ports.thunderbolt ?? 0) +
    (specs.ports.hdmi ?? 0) +
    (specs.ports.displayport ?? 0)

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{name}</CardTitle>
          <Badge variant="secondary" className="shrink-0 capitalize">
            {category.replace("-", " ")}
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

        <div className="grid grid-cols-2 gap-1 text-sm">
          <span className="text-muted-foreground">Interface</span>
          <span className="font-medium capitalize">{specs.host_interface.replace("-", " ")}</span>
          <span className="text-muted-foreground">Power Delivery</span>
          <span className="font-medium">{specs.power_delivery_w}W</span>
          <span className="text-muted-foreground">Total Ports</span>
          <span className="font-medium">{totalPorts}</span>
          <span className="text-muted-foreground">Max Displays</span>
          <span className="font-medium">{specs.max_displays}</span>
        </div>

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
