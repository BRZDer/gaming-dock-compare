import { Suspense } from "react"
import { loadAllProductsWithPrices } from "@/lib/data/loader"
import { CompareClient } from "./CompareClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Compare Gaming Docks Side by Side — Gaming Dock Compare",
  description: "Compare up to 4 gaming docking stations side by side. See prices, ports, power delivery, and specs at a glance.",
}

export const revalidate = 86400

export default function ComparePage() {
  const products = loadAllProductsWithPrices()
  return (
    <Suspense>
      <CompareClient products={products} />
    </Suspense>
  )
}
