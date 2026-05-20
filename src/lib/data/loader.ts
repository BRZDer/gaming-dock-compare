import fs from "fs"
import path from "path"
import yaml from "js-yaml"
import { Product, PriceSnapshot, ProductWithPrices } from "@/types/product"

const DATA_DIR = path.join(process.cwd(), "data")

export function loadAllProducts(): Product[] {
  const dir = path.join(DATA_DIR, "products")
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8")
    return yaml.load(raw) as Product
  })
}

export function loadProduct(slug: string): Product | null {
  const file = path.join(DATA_DIR, "products", `${slug}.yaml`)
  if (!fs.existsSync(file)) return null
  return yaml.load(fs.readFileSync(file, "utf-8")) as Product
}

export function loadPriceHistory(slug: string): PriceSnapshot[] {
  const dir = path.join(DATA_DIR, "prices", slug)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")) as PriceSnapshot)
}

export function loadProductWithPrices(slug: string): ProductWithPrices | null {
  const product = loadProduct(slug)
  if (!product) return null
  const history = loadPriceHistory(slug)
  const current = history.at(-1)
  return { ...product, current_price: current, price_history: history }
}

export function loadAllProductsWithPrices(): ProductWithPrices[] {
  return loadAllProducts().map((p) => {
    const history = loadPriceHistory(p.slug)
    return { ...p, current_price: history.at(-1), price_history: history }
  })
}
