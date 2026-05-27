"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface CompareContextValue {
  selected: string[]
  toggle: (slug: string) => void
  clear: () => void
}

const CompareContext = createContext<CompareContextValue>({
  selected: [],
  toggle: () => {},
  clear: () => {},
})

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = useCallback((slug: string) => {
    setSelected((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length < 4 ? [...prev, slug] : prev
    )
  }, [])

  const clear = useCallback(() => setSelected([]), [])

  return (
    <CompareContext.Provider value={{ selected, toggle, clear }}>
      {children}
    </CompareContext.Provider>
  )
}

export const useCompare = () => useContext(CompareContext)
