import type { CategoryId, Fact, Place } from '../types'
import { CATEGORIES } from '../config'
import { useConnectivity, useQuiet } from '../lib/data'

export type LensId = 'connectivity' | 'quiet' | 'family'

const TITLES: Record<LensId, { title: string; sub: string }> = {
  connectivity: { title: '🚆 Getting around', sub: 'Is this house cut off? The verified numbers.' },
  quiet: { title: '🤫 How quiet & secluded?', sub: 'The peace — and its honest trade-offs.' },
  family: { title: '👨‍👩‍👧 Family essentials', sub: 'Schools, childcare, doctors, pharmacies, vets.' },
}

function FactRow({ fact }: { fact: Fact }) {
  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-gray-600">{fact.label}</span>
        <span className="text-right text-sm font-semibold text-gray-900">{fact.value}</span>
      </div>
      {fact.detail && <p className="mt-1 text-xs leading-relaxed text-gray-500">{fact.detail}</p>}
      {fact.source?.url && (
        <a
          href={fact.source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-[11px] text-lake-600 hover:underline"
        >
          {fact.source.title || 'source'} ↗
        </a>
      )}
    </div>
  )
}

function FactsLens({ intro, facts }: { intro?: string; facts?: Fact[] }) {
  if (!facts) return <p className="p-4 text-sm text-gray-500">Loading…</p>
  return (
    <div className="p-4">
      {intro && <p className="mb-3 text-sm leading-relaxed text-gray-600">{intro}</p>}
      <div>
        {facts.map((f, i) => (
          <FactRow key={i} fact={f} />
        ))}
      </div>
    </div>
  )
}

function FamilyLens({ places }: { places: Place[] }) {
  const groups: { cat: CategoryId; label: string }[] = [
    { cat: 'school', label: CATEGORIES.school.label },
    { cat: 'kita', label: CATEGORIES.kita.label },
    { cat: 'health', label: CATEGORIES.health.label },
  ]
  return (
    <div className="p-4">
      <p className="mb-3 text-sm leading-relaxed text-gray-600">
        The non-negotiables for moving young kids. The closest-to-home essentials — the German
        Grundschule, a Kita and a vet — are within minutes; the international school, hospital and
        pharmacy are a short drive. (Tap a category in the filters to see these on the map.)
      </p>
      {groups.map(({ cat, label }) => {
        const items = places.filter((p) => p.category === cat)
        if (!items.length) return null
        return (
          <section key={cat} className="mb-4">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>{CATEGORIES[cat].emoji}</span> {label}
            </h3>
            <div className="space-y-2">
              {items.map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">{p.town}</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{p.blurb}</p>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function LensPanel({
  lens,
  places,
  onClose,
}: {
  lens: LensId
  places: Place[]
  onClose: () => void
}) {
  const connectivity = useConnectivity()
  const quiet = useQuiet()
  const meta = TITLES[lens]

  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="flex w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:w-[28rem]">
        <div className="flex items-start justify-between gap-3 border-b bg-lake-700 px-4 py-3 text-white">
          <div>
            <h2 className="text-base font-semibold">{meta.title}</h2>
            <p className="text-xs text-lake-100">{meta.sub}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-black/15 px-2 py-0.5 text-sm hover:bg-black/30"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {lens === 'connectivity' && (
            <FactsLens intro={connectivity.data?.intro} facts={connectivity.data?.facts} />
          )}
          {lens === 'quiet' && <FactsLens intro={quiet.data?.intro} facts={quiet.data?.facts} />}
          {lens === 'family' && <FamilyLens places={places} />}
        </div>
      </div>
    </div>
  )
}
