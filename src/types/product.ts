export interface ProductSpecs {
  ports: {
    usb_a?: number
    usb_c?: number
    thunderbolt?: number
    displayport?: number
    hdmi?: number
    ethernet?: number
    sd_card?: number
    audio?: number
  }
  power_delivery_w: number
  max_displays: number
  host_interface: "thunderbolt-5" | "thunderbolt-4" | "thunderbolt-3" | "usb-c" | "usb-a"
  dimensions_mm?: [number, number, number]
  weight_g?: number
}

export interface ProductReviews {
  amazon_asin?: string
  rtings_url?: string
  tomshardware_url?: string
  wirecutter_pick?: boolean
}

export interface Product {
  slug: string
  name: string
  brand: string
  category: string
  msrp_usd: number
  amazon_asin?: string
  bh_sku?: string
  newegg_sku?: string
  specs: ProductSpecs
  reviews: ProductReviews
  image_url?: string
}

export interface PriceSnapshot {
  date: string
  price_usd: number
  source: "amazon" | "bh" | "newegg" | "manual"
  in_stock: boolean
  affiliate_url?: string
}

export interface ProductWithPrices extends Product {
  current_price?: PriceSnapshot
  price_history: PriceSnapshot[]
  review_score?: number
  value_score?: number
}
