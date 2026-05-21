import { MetadataRoute } from "next"
import { loadAllProducts } from "@/lib/data/loader"

const BASE_URL = "https://gaming-dock-compare.vercel.app"

export default function sitemap(): MetadataRoute.Sitemap {
  const products = loadAllProducts()

  const productUrls = products.map((p) => ({
    url: `${BASE_URL}/products/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }))

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    ...productUrls,
  ]
}
