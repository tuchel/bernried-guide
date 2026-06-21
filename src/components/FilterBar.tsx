import type { Band, CategoryId, TransportMode } from '../types'
import {
  BANDS,
  CATEGORIES,
  CATEGORY_GROUPS,
  MODES,
} from '../config'

interface Props {
  activeCategories: Set<CategoryId>
  toggleCategory: (c: CategoryId) => void
  setGroup: (group: string, on: boolean) => void
  counts: Partial<Record<CategoryId, number>>
  mode: TransportMode | null
  setMode: (m: TransportMode | null) => void
  bands: Set<Band>
  toggleBand: (b: Band) => void
}

const MODE_ORDER: TransportMode[] = ['walk', 'bike', 'ebike', 'drive', 'transit']

export function FilterBar({
  activeCategories,
  toggleCategory,
  setGroup,
  counts,
  mode,
  setMode,
  bands,
  toggleBand,
}: Props) {
  const categoriesByGroup = (group: string) =>
    (Object.keys(CATEGORIES) as CategoryId[]).filter(
      (c) => CATEGORIES[c].group === group,
    )

  return (
    <div className="flex flex-col gap-5 p-4 text-sm">
      {/* Isochrone controls */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Travel time from the house
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {MODE_ORDER.map((m) => {
            const on = mode === m
            return (
              <button
                key={m}
                onClick={() => setMode(on ? null : m)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  on
                    ? 'border-transparent text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
                style={on ? { background: MODES[m].color } : undefined}
                title={MODES[m].note}
              >
                {MODES[m].emoji} {MODES[m].label}
              </button>
            )
          })}
        </div>
        {mode && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Show:</span>
            {BANDS.map((b) => {
              const on = bands.has(b)
              return (
                <button
                  key={b}
                  onClick={() => toggleBand(b)}
                  className={`rounded-full border px-2 py-0.5 text-xs transition ${
                    on
                      ? 'border-transparent text-white'
                      : 'border-gray-300 bg-white text-gray-600'
                  }`}
                  style={on ? { background: MODES[mode].color } : undefined}
                >
                  {b} min
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Category toggles */}
      {CATEGORY_GROUPS.map((group) => {
        const cats = categoriesByGroup(group)
        const allOn = cats.every((c) => activeCategories.has(c))
        return (
          <section key={group}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {group}
              </h2>
              <button
                onClick={() => setGroup(group, !allOn)}
                className="text-[11px] text-lake-600 hover:underline"
              >
                {allOn ? 'Hide all' : 'Show all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cats.map((c) => {
                const meta = CATEGORIES[c]
                const on = activeCategories.has(c)
                const n = counts[c] ?? 0
                return (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
                      on
                        ? 'border-transparent text-white'
                        : 'border-gray-200 bg-white text-gray-400'
                    }`}
                    style={on ? { background: meta.color } : undefined}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                    <span className={on ? 'opacity-80' : 'opacity-60'}>{n}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
