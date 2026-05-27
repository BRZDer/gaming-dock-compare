import type { ProductSpecs } from "@/types/product"

const BANDWIDTH: Record<string, string> = {
  "thunderbolt-5": "120 Gbps",
  "thunderbolt-4": "40 Gbps",
  "thunderbolt-3": "40 Gbps",
  "usb4": "40 Gbps",
  "usb3": "10 Gbps",
  "usb-a": "5 Gbps",
}

const MAX_RESOLUTION: Record<string, string> = {
  "thunderbolt-5": "up to 8K",
  "thunderbolt-4": "up to 6K",
  "thunderbolt-3": "up to 5K",
  "usb4": "up to 6K",
  "usb3": "up to 4K",
  "usb-a": "up to 1080p",
}

const INTERFACE_LABELS: Record<string, string> = {
  "thunderbolt-5": "Thunderbolt 5",
  "thunderbolt-4": "Thunderbolt 4",
  "thunderbolt-3": "Thunderbolt 3",
  "usb4": "USB 4",
  "usb3": "USB 3",
  "usb-a": "USB-A",
}

export function getInterfaceLabel(iface: string): string {
  return INTERFACE_LABELS[iface] ?? iface.replace(/-/g, " ")
}

export function getBandwidth(specs: ProductSpecs): string {
  return BANDWIDTH[specs.host_interface] ?? "—"
}

export function getMaxResolution(specs: ProductSpecs): string {
  return MAX_RESOLUTION[specs.host_interface] ?? "—"
}
