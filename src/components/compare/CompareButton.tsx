"use client"

import { useCompare } from "./CompareProvider"
import { useRouter } from "next/navigation"

export function CompareButton() {
  const { selected, clear } = useCompare()
  const router = useRouter()

  if (selected.length === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => router.push(`/compare?products=${selected.join(",")}`)}
        className="px-3 py-1.5 text-xs rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
      >
        Apply ({selected.length}) →
      </button>
      <button
        onClick={clear}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Clear selection"
      >
        ✕
      </button>
    </div>
  )
}
