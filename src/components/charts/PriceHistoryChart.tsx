"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { PriceSnapshot } from "@/types/product"

interface Props {
  history: PriceSnapshot[]
}

type Range = "30" | "90" | "all"

export function PriceHistoryChart({ history }: Props) {
  const [range, setRange] = useState<Range>("90")

  const cutoff = new Date()
  if (range !== "all") cutoff.setDate(cutoff.getDate() - parseInt(range))

  const data = history
    .filter((s) => range === "all" || new Date(s.date) >= cutoff)
    .map((s) => ({ date: s.date.slice(5), price: s.price_usd }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground rounded-lg border border-dashed">
        No price history yet — check back after the first daily scrape.
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(["30", "90", "all"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              range === r
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input hover:bg-accent"
            }`}
          >
            {r === "all" ? "All" : `${r}d`}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
            domain={["auto", "auto"]}
          />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]} />
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
