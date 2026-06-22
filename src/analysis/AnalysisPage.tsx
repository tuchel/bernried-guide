import { BenchmarkBars, CompsBars, PositioningBar, TrendLine } from './Charts'
import {
  COMPS,
  DETRACTORS,
  DRIVERS,
  EXEC_SUMMARY,
  MARKET_FACTS,
  METHOD_NOTE,
  PRICE,
  PROPERTY_STATS,
  SOURCES,
} from './data'

const eur0 = (n: number) => '€' + n.toLocaleString('en-US')

function Cite({ n }: { n: number }) {
  const s = SOURCES.find((x) => x.n === n)
  if (!s) return null
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noreferrer"
      title={s.title}
      className="ml-0.5 align-super text-[10px] font-medium text-lake-600 hover:underline"
    >
      [{n}]
    </a>
  )
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-3xl scroll-mt-16 px-4 py-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-lake-600">{eyebrow}</p>
      <h2 className="mb-3 text-xl font-semibold text-gray-900 sm:text-2xl">{title}</h2>
      {children}
    </section>
  )
}

export function AnalysisPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-full overflow-y-auto bg-[#f6f7f5]">
      {/* Hero */}
      <header className="bg-lake-800 text-white">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <button onClick={onBack} className="mb-3 text-xs text-lake-100 hover:text-white">
            ← Back to the guide
          </button>
          <p className="text-xs font-semibold uppercase tracking-wide text-lake-200">Real estate analysis</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
            Reitweg 25 — is €9.75M the right price?
          </h1>
          <p className="mt-1 text-sm text-lake-100">
            A market positioning &amp; valuation read for the design villa at 82347 Bernried am Starnberger See
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-3">
            {[
              { k: 'Asking', v: '€9.75M' },
              { k: '€/m² living', v: eur0(PRICE.perM2Living) },
              { k: '€/m² usable', v: eur0(PRICE.perM2Usable) },
            ].map((m) => (
              <div key={m.k} className="rounded-lg bg-white/10 px-3 py-2">
                <div className="text-lg font-bold">{m.v}</div>
                <div className="text-[11px] text-lake-100">{m.k}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Executive summary */}
      <div className="mx-auto max-w-3xl px-4 pt-7">
        <div className="rounded-xl border-l-4 border-lake-600 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-lake-700">Executive summary</h2>
          {EXEC_SUMMARY.split('\n\n').map((p, i) => (
            <p key={i} className="mb-2.5 text-sm leading-relaxed text-gray-700 last:mb-0">{p}</p>
          ))}
        </div>
      </div>

      {/* The property */}
      <Section id="property" eyebrow="The asset" title="What €9.75M buys">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PROPERTY_STATS.map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="text-base font-bold text-gray-900">{s.value}</div>
              <div className="text-[11px] font-medium text-gray-600">{s.label}</div>
              {s.note && <div className="mt-0.5 text-[10px] text-gray-400">{s.note}</div>}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-gray-700">
          A 1970 villa (attributed to Franz Ruf) given a high-end core renovation in 2017/18 by the award-winning Munich
          firm Landau + Kindelbacher<Cite n={11} />. Cathedral-height hall, air-dried Champagne-oak floors, brass
          fittings, a 16 m heated pool, and a self-contained two-storey spa/guest house — set on a 3,887 m² park-like
          plot that borders, and visually merges into, the permanently-protected Bernrieder Park<Cite n={13} />. Listed
          by Riedel Immobilien, the exclusive Munich affiliate of Christie's International Real Estate<Cite n={21} />.
        </p>
        <div className="mt-3 rounded-lg bg-lake-50 p-3 text-sm text-gray-700">
          Total cost to acquire ≈ <strong>{eur0(PRICE.total)}</strong> (asking {eur0(PRICE.asking)} +{' '}
          {PRICE.commissionPct}% buyer commission ≈ {eur0(PRICE.commission)}).
        </div>
      </Section>

      {/* Market context */}
      <Section id="market" eyebrow="Market context" title="One of Germany's most expensive corners">
        <div className="mb-4 space-y-2">
          {MARKET_FACTS.map((f) => (
            <div key={f.label} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="shrink-0 text-lg font-bold text-lake-700">{f.stat}</div>
              <div className="text-sm text-gray-700">
                {f.label}
                {f.src && <Cite n={f.src} />}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-gray-700">
          The Starnberger See sits in the wealthiest commuter belt in Germany, on a lake whose shoreline is mostly
          state-owned and protected — so supply at the top is structurally scarce. Prime lakeside property fell less
          than the −8.4% national drop in 2023<Cite n={7} /> and has since recovered<Cite n={17} />.
        </p>
        <TrendLine />
      </Section>

      {/* Benchmarks */}
      <Section id="benchmarks" eyebrow="Price benchmarks" title="Bernried is the cheapest town — so this is a trophy premium">
        <p className="mb-1 text-sm leading-relaxed text-gray-700">
          On ordinary-house asking prices, Bernried is the lowest of the seven west-bank towns. So the €9.75M ask isn't a
          pricey-town effect — it is a premium for this specific asset.
        </p>
        <BenchmarkBars />
      </Section>

      {/* Comparables */}
      <Section id="comparables" eyebrow="Comparables" title="How it stacks up against real listings">
        <CompsBars />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-300 text-gray-500">
              <tr>
                <th className="py-1.5 pr-2">Town</th>
                <th className="py-1.5 pr-2">Price</th>
                <th className="py-1.5 pr-2">Living</th>
                <th className="py-1.5 pr-2">€/m²</th>
                <th className="py-1.5 pr-2">Lake</th>
                <th className="py-1.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {COMPS.map((c) => (
                <tr key={c.town + c.price} className={`border-b border-gray-100 ${c.subject ? 'bg-lake-50 font-medium' : ''}`}>
                  <td className="py-1.5 pr-2">{c.town}{c.subject && ' ★'}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">€{(c.price / 1_000_000).toFixed(2)}M</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{c.livingM2} m²</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{eur0(c.perM2)}</td>
                  <td className="py-1.5 pr-2">{c.proximity}</td>
                  <td className="py-1.5 text-gray-500">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">All asking prices (German sold prices are private). Söcking entries are heritage-parkland outliers whose €/m² is inflated by small living areas.</p>
      </Section>

      {/* Positioning / verdict */}
      <Section id="positioning" eyebrow="Positioning" title="Priced like the top of the near-lake tier">
        <PositioningBar />
        <div className="mt-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-semibold text-amber-900">The verdict</h3>
          <p className="text-sm leading-relaxed text-amber-900/90">
            On living area the ask reaches into the direct-waterfront trophy tier — but the villa is near-lake, not
            waterfront, so that framing is rich. On usable area (€{PRICE.perM2Usable.toLocaleString()}) it sits inside
            the near-lake luxury band where renovated villas actually trade. The €9.75M is defensible for a buyer who
            values the permanently-protected setting, the large plot, and the architecture; it is aggressive on a pure
            living-area basis. The swing factor is scarcity — there is no second plot like this — which is exactly what
            commands a "Liebhaberpreis" (collector's price). Confirm the official parcel land value at BORIS-Bayern
            <Cite n={9} /> before bidding.
          </p>
        </div>
      </Section>

      {/* Drivers & detractors */}
      <Section id="drivers" eyebrow="The case" title="What justifies the premium — and what doesn't">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-emerald-700">▲ Value drivers</h3>
            <div className="space-y-2.5">
              {DRIVERS.map((d) => (
                <div key={d.title} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                  <div className="text-sm font-semibold text-gray-800">{d.title}{d.src && <Cite n={d.src} />}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{d.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-rose-700">▼ Value detractors</h3>
            <div className="space-y-2.5">
              {DETRACTORS.map((d) => (
                <div key={d.title} className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                  <div className="text-sm font-semibold text-gray-800">{d.title}{d.src && <Cite n={d.src} />}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{d.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Method & sources */}
      <Section id="sources" eyebrow="Method & sources" title="How to read these numbers">
        <p className="text-sm leading-relaxed text-gray-700">{METHOD_NOTE}</p>
        <ol className="mt-3 space-y-1 text-xs text-gray-500">
          {SOURCES.map((s) => (
            <li key={s.n}>
              <span className="text-gray-400">[{s.n}]</span>{' '}
              <a href={s.url} target="_blank" rel="noreferrer" className="text-lake-600 hover:underline">{s.title} ↗</a>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[11px] text-gray-400">
          Prepared as a decision aid, not a formal appraisal. Includes information from the private sales exposé.
        </p>
        <button onClick={onBack} className="mt-4 rounded-md bg-lake-600 px-4 py-2 text-sm font-medium text-white hover:bg-lake-700">
          ← Back to the guide
        </button>
      </Section>
    </div>
  )
}
