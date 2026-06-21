import { useMemo, useState } from 'react'
import { MapView } from './components/MapView'
import { FilterBar } from './components/FilterBar'
import { DetailPanel } from './components/DetailPanel'
import { Legend } from './components/Legend'
import { LensPanel, type LensId } from './components/LensPanel'
import { usePlaces } from './lib/data'
import { CATEGORIES, GOOGLE_MAPS_API_KEY, HOME } from './config'
import type { Band, CategoryId, TransportMode } from './types'

const DEFAULT_ON: CategoryId[] = (Object.keys(CATEGORIES) as CategoryId[]).filter(
  (c) => ['Daily life', 'Fun & outings'].includes(CATEGORIES[c].group),
)

export default function App() {
  const { data: places } = usePlaces()
  const list = places ?? []

  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
    () => new Set(DEFAULT_ON),
  )
  const [mode, setMode] = useState<TransportMode | null>(null)
  const [bands, setBands] = useState<Set<Band>>(() => new Set<Band>([10, 30, 60]))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [lens, setLens] = useState<LensId | null>(null)

  const counts = useMemo(() => {
    const c: Partial<Record<CategoryId, number>> = {}
    for (const p of list) c[p.category] = (c[p.category] ?? 0) + 1
    return c
  }, [list])

  const selected = list.find((p) => p.id === selectedId) ?? null

  const toggleCategory = (cat: CategoryId) =>
    setActiveCategories((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  const setGroup = (group: string, on: boolean) =>
    setActiveCategories((prev) => {
      const next = new Set(prev)
      for (const c of Object.keys(CATEGORIES) as CategoryId[])
        if (CATEGORIES[c].group === group) on ? next.add(c) : next.delete(c)
      return next
    })
  const toggleBand = (b: Band) =>
    setBands((prev) => {
      const next = new Set(prev)
      next.has(b) ? next.delete(b) : next.add(b)
      return next
    })

  const filterProps = {
    activeCategories,
    toggleCategory,
    setGroup,
    counts,
    mode,
    setMode,
    bands,
    toggleBand,
  }

  const lensButtons: { id: LensId; label: string }[] = [
    { id: 'connectivity', label: '🚆 Getting around' },
    { id: 'quiet', label: '🤫 How quiet?' },
    { id: 'family', label: '👨‍👩‍👧 Family' },
  ]

  return (
    <div className="flex h-full flex-col">
      <header className="z-20 border-b border-black/10 bg-lake-800 text-white shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">
              Bernried · a family guide to the Starnberger See
            </h1>
            <p className="hidden text-xs text-lake-100 sm:block">
              Everyday life & adventures around {HOME.address}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {lensButtons.map((b) => (
              <button
                key={b.id}
                onClick={() => setLens(b.id)}
                className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/20"
              >
                {b.label}
              </button>
            ))}
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/20 lg:hidden"
            >
              ⚙ Filters
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-black/10 bg-white lg:block">
          <FilterBar {...filterProps} />
        </aside>

        {/* Map */}
        <main className="relative flex-1">
          <MapView
            places={list}
            activeCategories={activeCategories}
            mode={mode}
            bands={bands}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {mode && <Legend mode={mode} bands={bands} />}

          {!GOOGLE_MAPS_API_KEY && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] text-gray-600 shadow">
              Preview basemap · live Google photos & reviews switch on with the API key
            </div>
          )}

          {/* Detail panel: right card on desktop, bottom sheet on mobile */}
          {selected && (
            <div className="absolute inset-x-0 bottom-0 z-20 max-h-[55%] rounded-t-2xl bg-white shadow-2xl sm:inset-x-auto sm:right-3 sm:top-3 sm:bottom-3 sm:max-h-none sm:w-80 sm:rounded-xl">
              <DetailPanel place={selected} onClose={() => setSelectedId(null)} />
            </div>
          )}
        </main>

        {/* Mobile filter drawer */}
        {filtersOpen && (
          <div className="absolute inset-0 z-30 flex lg:hidden">
            <div
              className="flex-1 bg-black/30"
              onClick={() => setFiltersOpen(false)}
            />
            <div className="w-80 max-w-[85%] overflow-y-auto bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-semibold">Filters</span>
                <button onClick={() => setFiltersOpen(false)} className="text-gray-500">
                  ✕
                </button>
              </div>
              <FilterBar {...filterProps} />
            </div>
          </div>
        )}

        {/* Lens panel overlay */}
        {lens && <LensPanel lens={lens} places={list} onClose={() => setLens(null)} />}
      </div>
    </div>
  )
}
