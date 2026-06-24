import {
  ASSUMPTIONS,
  COSTS,
  EXEC_SUMMARY,
  GRUNDSTEUER,
  GROUP_COLORS,
  SOURCES,
  TOTALS,
  type CostGroup,
} from './data'

const eur = (n: number) => '€' + n.toLocaleString('en-US')
const eurK = (n: number) => '€' + Math.round(n / 1000) + 'k'

function bold(text: string) {
  return text.split('**').map((seg, i) => (i % 2 ? <strong key={i}>{seg}</strong> : seg))
}

function Cite({ n }: { n: number }) {
  const s = SOURCES.find((x) => x.n === n)
  if (!s) return null
  return (
    <a href={s.url} target="_blank" rel="noreferrer" title={s.title} className="ml-0.5 align-super text-[10px] font-medium text-lake-600 hover:underline">
      [{n}]
    </a>
  )
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-3xl px-4 py-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-lake-600">{eyebrow}</p>
      <h2 className="mb-3 text-xl font-semibold text-gray-900 sm:text-2xl">{title}</h2>
      {children}
    </section>
  )
}

/** Where the money goes — point estimate by group, as horizontal bars. */
function GroupBars() {
  const groups = [...new Set(COSTS.map((c) => c.group))] as CostGroup[]
  const totals = groups
    .map((g) => ({ g, v: COSTS.filter((c) => c.group === g).reduce((s, c) => s + c.point, 0) }))
    .sort((a, b) => b.v - a.v)
  const max = Math.max(...totals.map((t) => t.v))
  const grand = totals.reduce((s, t) => s + t.v, 0)
  const rowH = 38
  const x0 = 150
  const w = 320
  const height = totals.length * rowH + 8
  return (
    <figure className="my-5 rounded-xl border border-gray-200 bg-white p-4">
      <figcaption className="mb-2 text-sm font-semibold text-gray-800">Where the money goes (point estimate, €/yr)</figcaption>
      <svg viewBox={`0 0 560 ${height}`} width="100%" height="auto">
        {totals.map((t, i) => {
          const y = i * rowH + 6
          const bw = (t.v / max) * w
          return (
            <g key={t.g}>
              <text x={x0 - 6} y={y + rowH / 2 - 2} fontSize="11" fill="#374151" textAnchor="end">{t.g}</text>
              <rect x={x0} y={y + 4} width={bw} height={rowH - 14} rx="2" fill={GROUP_COLORS[t.g]} />
              <text x={x0 + bw + 5} y={y + rowH / 2} fontSize="10.5" fill="#374151" fontWeight="600">{eur(t.v)}</text>
              <text x={x0 - 6} y={y + rowH / 2 + 11} fontSize="9" fill="#9ca3af" textAnchor="end">{Math.round((t.v / grand) * 100)}%</text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

export function CostsPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-full overflow-y-auto bg-[#f6f7f5]">
      <header className="bg-lake-800 text-white">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <button onClick={onBack} className="mb-3 text-xs text-lake-100 hover:text-white">← Back to the guide</button>
          <p className="text-xs font-semibold uppercase tracking-wide text-lake-200">Running costs</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">What does it cost to run this house?</h1>
          <p className="mt-1 text-sm text-lake-100">A ground-up estimate of the all-in annual cost of owning Reitweg 25</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { k: 'All-in / year', v: '~€70k' },
              { k: 'Cash out the door', v: '~€42k' },
              { k: 'of purchase price', v: '~0.71%' },
            ].map((m) => (
              <div key={m.k} className="rounded-lg bg-white/10 px-3 py-2">
                <div className="text-lg font-bold">{m.v}</div>
                <div className="text-[11px] text-lake-100">{m.k}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-7">
        <div className="rounded-xl border-l-4 border-lake-600 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-lake-700">Executive summary</h2>
          {EXEC_SUMMARY.split('\n\n').map((p, i) => (
            <p key={i} className="mb-2.5 text-sm leading-relaxed text-gray-700 last:mb-0">{bold(p)}</p>
          ))}
        </div>
      </div>

      <Section id="breakdown" eyebrow="Breakdown" title="Upkeep and labor dominate">
        <GroupBars />
        <p className="text-sm leading-relaxed text-gray-700">
          The maintenance reserve (~€28k) and people (housekeeping + garden, ~€18k) are the two biggest buckets — together over
          half the all-in cost. Energy is the largest single hard bill. Property tax, by contrast, is trivially small.
        </p>
      </Section>

      <Section id="items" eyebrow="Line items" title="The full ledger">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-300 text-gray-500">
              <tr>
                <th className="py-1.5 pr-2">Item</th>
                <th className="py-1.5 pr-2 text-right">Low</th>
                <th className="py-1.5 pr-2 text-right">Point</th>
                <th className="py-1.5 pr-2 text-right">High</th>
                <th className="hidden py-1.5 sm:table-cell">Basis</th>
              </tr>
            </thead>
            <tbody>
              {COSTS.map((c) => (
                <tr key={c.label} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: GROUP_COLORS[c.group] }} />
                    {c.label}
                    {c.computed && <span className="ml-1 text-[9px] text-gray-400">calc</span>}
                    {c.src && <Cite n={c.src} />}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-gray-400">{eur(c.low)}</td>
                  <td className="py-1.5 pr-2 text-right font-medium text-gray-800">{eur(c.point)}</td>
                  <td className="py-1.5 pr-2 text-right text-gray-400">{eur(c.high)}</td>
                  <td className="hidden py-1.5 text-gray-500 sm:table-cell">{c.basis}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="py-2 pr-2">Total, all-in</td>
                <td className="py-2 pr-2 text-right text-gray-500">{eurK(TOTALS.allIn.low)}</td>
                <td className="py-2 pr-2 text-right text-lake-700">{eur(TOTALS.allIn.point)}</td>
                <td className="py-2 pr-2 text-right text-gray-500">{eurK(TOTALS.allIn.high)}</td>
                <td className="hidden sm:table-cell" />
              </tr>
              <tr className="text-gray-500">
                <td className="py-1 pr-2 text-xs font-normal">…cash out the door (reserve treated as savings)</td>
                <td className="py-1 pr-2 text-right text-xs">{eurK(TOTALS.cash.low)}</td>
                <td className="py-1 pr-2 text-right text-xs font-medium">{eur(TOTALS.cash.point)}</td>
                <td className="py-1 pr-2 text-right text-xs">{eurK(TOTALS.cash.high)}</td>
                <td className="hidden sm:table-cell" />
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="grundsteuer" eyebrow="Worth knowing" title="Property tax barely registers">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <table className="w-full text-sm">
            <tbody>
              {GRUNDSTEUER.steps.map((s) => (
                <tr key={s.label} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-3 font-medium text-gray-700">{s.label}</td>
                  <td className="py-1.5 pr-3 text-gray-500">{s.calc}</td>
                  <td className="py-1.5 text-right font-semibold text-gray-900">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{GRUNDSTEUER.note}<Cite n={1} /></p>
        </div>
      </Section>

      <Section id="assumptions" eyebrow="Method & sources" title="What's assumed, what's excluded">
        <ul className="space-y-1.5 text-sm text-gray-700">
          {ASSUMPTIONS.map((a, i) => (
            <li key={i} className="flex gap-2"><span className="text-lake-500">•</span>{a}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Excluded as not "running costs": financing/interest, capital renovations, valuables (art) cover, and Hausverwaltung if outsourced.
        </p>
        <ol className="mt-3 space-y-1 text-xs text-gray-500">
          {SOURCES.map((s) => (
            <li key={s.n}>
              <span className="text-gray-400">[{s.n}]</span>{' '}
              <a href={s.url} target="_blank" rel="noreferrer" className="text-lake-600 hover:underline">{s.title} ↗</a>
            </li>
          ))}
        </ol>
        <button onClick={onBack} className="mt-4 rounded-md bg-lake-600 px-4 py-2 text-sm font-medium text-white hover:bg-lake-700">← Back to the guide</button>
      </Section>
    </div>
  )
}
