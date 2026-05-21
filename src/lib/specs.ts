import type { ProductSpecs } from "@/types/product"

const BANDWIDTH: Record<string, string> = {
  "thunderbolt-5": "120 Gbps",
  "thunderbolt-4": "40 Gbps",
  "thunderbolt-3": "40 Gbps",
  "usb-c": "10 Gbps",
  "usb-a": "5 Gbps",
}

const MAX_RESOLUTION: Record<string, string> = {
  "thunderbolt-5": "up to 8K",
  "thunderbolt-4": "up to 6K",
  "thunderbolt-3": "up to 5K",
  "usb-c": "up to 4K",
  "usb-a": "up to 1080p",
}

export function getBandwidth(specs: ProductSpecs): string {
  return BANDWIDTH[specs.host_interface] ?? "—"
}

export function getMaxResolution(specs: ProductSpecs): string {
  return MAX_RESOLUTION[specs.host_interface] ?? "—"
}
