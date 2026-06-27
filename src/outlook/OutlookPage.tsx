import { useDeferredValue, useMemo, useState } from 'react'
import { runStrategy, type Inputs, type McResult, type Strategy, type YearRow } from './engine'
import { ASSUMPTIONS, DEFAULTS, INTRO, SOURCES, STRATEGY_BLURB, STRATEGY_COLOR, STRATEGY_LABEL } from './data'

function fmtEur(n: number): string {
  const a = Math.abs(n)
  const s = n < 0 ? '−' : ''
  if (a >= 1e9) return `${s}€${(a / 1e9).toFixed(a >= 1e10 ? 1 : 2)}B`
  if (a >= 1e6) return `${s}€${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M`
  if (a >= 1e3) return `${s}€${Math.round(a / 1e3)}k`
  return `${s}€${Math.round(a)}`
}
const pct = (x: number) => `${(x * 100).toFixed(0)}%`
const STRATS: Strategy[] = ['outright', 'borrow', 'hybrid']

const COMP = [
  { key: 'spacex', label: 'SpaceX', color: '#1d6f8b' },
  { key: 'tsla', label: 'TSLA', color: '#b3402f' },
  { key: 'goog', label: 'GOOG', color: '#5a8f4a' },
  { key: 'div', label: 'Diversified', color: '#0891b2' },
  { key: 'cash', label: 'Cash', color: '#94a3b8' },
  { key: 'house', label: 'House', color: '#ca8a04' },
] as const

// ---- Monte Carlo net-worth cone (log scale), with optional strategy overlays ----
function ConeChart({ mc, overlays }: { mc: McResult; overlays?: { color: string; arr: number[] }[] }) {
  const W = 580, H = 300, padL = 50, padR = 14, padT = 12, padB = 26
  const floor = 1e6
  const cl = (arr: number[]) => arr.map((v) => (Number.isFinite(v) && v > 0 ? v : floor))
  const p10 = cl(mc.p10), p25 = cl(mc.p25), p50 = cl(mc.p50), p75 = cl(mc.p75), p90 = cl(mc.p90)
  const ov = overlays?.map((o) => ({ color: o.color, arr: cl(o.arr) }))
  const years = mc.years
  const xmax = Math.max(1, years[years.length - 1] || 1)
  const x = (yr: number) => padL + (yr / xmax) * (W - padL - padR)
  const hi = Math.max(floor * 10, ...p90, ...(ov?.flatMap((o) => o.arr) ?? []))
  const yhi = Math.pow(10, Math.ceil(Math.log10(hi)))
  const ylo = floor
  const Lg = (v: number) => Math.log10(Math.max(floor, v))
  const y = (v: number) => padT + (1 - (Lg(v) - Lg(ylo)) / (Lg(yhi) - Lg(ylo))) * (H - padT - padB)
  const band = (lo: number[], up: number[]) => {
    const top = years.map((yr, i) => `${x(yr).toFixed(1)},${y(up[i]).toFixed(1)}`)
    const bot = years.map((yr, i) => `${x(yr).toFixed(1)},${y(lo[i]).toFixed(1)}`).reverse()
    return `M${top.join('L')}L${bot.join('L')}Z`
  }
  const line = (arr: number[]) => 'M' + years.map((yr, i) => `${x(yr).toFixed(1)},${y(arr[i]).toFixed(1)}`).join('L')
  const decades: number[] = []
  for (let e = Math.log10(ylo); e <= Math.log10(yhi) + 0.5; e++) decades.push(Math.pow(10, e))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" className="overflow-visible">
      {decades.map((d) => (
        <g key={d}>
          <line x1={padL} x2={W - padR} y1={y(d)} y2={y(d)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={padL - 6} y={y(d) + 3} fontSize="9" fill="#9ca3af" textAnchor="end">{fmtEur(d)}</text>
        </g>
      ))}
      {years.filter((yr) => yr % 5 === 0).map((yr) => (
        <text key={yr} x={x(yr)} y={H - padB + 16} fontSize="9" fill="#9ca3af" textAnchor="middle">{yr === 0 ? 'now' : `+${yr}y`}</text>
      ))}
      <path d={band(p10, p90)} fill="#2b82a5" opacity={ov ? 0.07 : 0.12} />
      <path d={band(p25, p75)} fill="#2b82a5" opacity={ov ? 0.1 : 0.2} />
      {ov
        ? ov.map((o, i) => <path key={i} d={line(o.arr)} fill="none" stroke={o.color} strokeWidth="2" />)
        : <path d={line(p50)} fill="none" stroke="#1d6f8b" strokeWidth="2" />}
    </svg>
  )
}

// ---- Net-worth composition over time (stacked, median path) ----
function CompositionChart({ rows }: { rows: YearRow[] }) {
  const W = 580, H = 230, padL = 50, padR = 14, padT = 10, padB = 24
  const F = (v: number) => (Number.isFinite(v) ? v : 0)
  const years = rows.map((r) => r.year)
  const xmax = Math.max(1, years[years.length - 1] || 1)
  const layers = rows.map((r) => [r.comp.spacex, r.comp.tsla, r.comp.goog, r.comp.div, r.comp.cash, r.houseEur].map(F))
  const totals = layers.map((l) => l.reduce((s, v) => s + v, 0))
  const ymax = Math.max(1, ...totals)
  const x = (yr: number) => padL + (yr / xmax) * (W - padL - padR)
  const y = (v: number) => padT + (1 - v / ymax) * (H - padT - padB)
  const areaFor = (idx: number) => {
    const lo = layers.map((l) => l.slice(0, idx).reduce((s, v) => s + v, 0))
    const hi = layers.map((l) => l.slice(0, idx + 1).reduce((s, v) => s + v, 0))
    const top = years.map((yr, i) => `${x(yr).toFixed(1)},${y(hi[i]).toFixed(1)}`)
    const bot = years.map((yr, i) => `${x(yr).toFixed(1)},${y(lo[i]).toFixed(1)}`).reverse()
    return `M${top.join('L')}L${bot.join('L')}Z`
  }
  const netLine = 'M' + rows.map((r, i) => `${x(years[i]).toFixed(1)},${y(totals[i] - F(r.debtEur)).toFixed(1)}`).join('L')
  const ticks = [0, 0.5, 1].map((f) => f * ymax)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
          <text x={padL - 6} y={y(t) + 3} fontSize="9" fill="#9ca3af" textAnchor="end">{fmtEur(t)}</text>
        </g>
      ))}
      {COMP.map((c, idx) => <path key={c.key} d={areaFor(idx)} fill={c.color} opacity="0.82" />)}
      <path d={netLine} fill="none" stroke="#111827" strokeWidth="1.5" strokeDasharray="3 2" />
      {years.filter((yr) => yr % 5 === 0).map((yr) => (
        <text key={yr} x={x(yr)} y={H - padB + 14} fontSize="9" fill="#9ca3af" textAnchor="middle">{yr === 0 ? 'now' : `+${yr}y`}</text>
      ))}
    </svg>
  )
}

function Num({ label, value, onChange, step = 1, suffix, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-gray-600">{label}{hint && <span className="ml-1 text-gray-400">{hint}</span>}</span>
      <div className="mt-0.5 flex items-center rounded-md border border-gray-300 bg-white px-2 focus-within:border-lake-500">
        <input type="number" value={value} step={step} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full bg-transparent py-1 text-sm outline-none" />
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
    </label>
  )
}
function Pct({ label, value, onChange, max = 0.6, step = 0.005 }: { label: string; value: number; onChange: (v: number) => void; max?: number; step?: number }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] font-medium text-gray-600"><span>{label}</span><span className="tabular-nums text-gray-500">{(value * 100).toFixed(1)}%</span></span>
      <input type="range" min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-lake-600" />
    </label>
  )
}
function Group({ title, children, cols = 2, note }: { title: string; children: React.ReactNode; cols?: number; note?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-lake-700">{title}</h3>
      {note && <p className="mb-3 text-[11px] leading-snug text-gray-500">{note}</p>}
      <div className={`mt-2 grid gap-3 ${cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>{children}</div>
    </div>
  )
}

export function OutlookPage({ onBack }: { onBack: () => void }) {
  const [inp, setInp] = useState<Inputs>(DEFAULTS)
  const [selected, setSelected] = useState<Strategy>('hybrid')
  const [stackAll, setStackAll] = useState(false)
  const deferred = useDeferredValue(inp)
  const results = useMemo(
    () => ({
      outright: runStrategy(deferred, 'outright'),
      borrow: runStrategy(deferred, 'borrow'),
      hybrid: runStrategy(deferred, 'hybrid'),
    }),
    [deferred],
  )
  const sel = results[selected]
  const busy = inp !== deferred
  const set = (patch: Partial<Inputs>) => setInp((p) => ({ ...p, ...patch }))
  const setAsset = (k: 'spacex' | 'tsla' | 'goog' | 'div', patch: Partial<Inputs['spacex']>) =>
    setInp((p) => ({ ...p, [k]: { ...p[k], ...patch } }))

  const portfolioUsd = inp.spacexShares * inp.spacexPrice + inp.tslaValue + inp.googValue + inp.cashUsd
  const portfolioEur = portfolioUsd / inp.eurUsd
  const houseShare = inp.housePriceEur / (portfolioEur + inp.housePriceEur)
  const d0 = sel.deterministic[0].comp // asset split at purchase (after t=0 funding + diversification)
  const burnTotal =
    inp.burnHouseOps + inp.burnSchooling + inp.burnChildcare + inp.burnHealth +
    inp.burnInsurance + inp.burnAdvisory + inp.burnGeneral + inp.burnTravel

  return (
    <div className="h-full overflow-y-auto bg-[#f6f7f5]">
      <header className="bg-lake-800 text-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <button onClick={onBack} className="mb-3 text-xs text-lake-100 hover:text-white">← Back to the guide</button>
          <p className="text-xs font-semibold uppercase tracking-wide text-lake-200">Financial outlook</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">What does buying this house do to our future?</h1>
          <p className="mt-1 text-sm text-lake-100">A live {inp.horizon}-year simulator — outright vs. borrowing vs. hybrid, with tax, volatility, margin calls and FX</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: `Liquid in ${inp.horizon}y (median)`, v: fmtEur(sel.mc.terminalLiquid.p50) },
              { k: 'Liquid downside (p10)', v: fmtEur(sel.mc.terminalLiquid.p10) },
              { k: 'Chance of running dry', v: pct(sel.mc.ruinProb) },
              { k: 'Up-front tax to buy', v: fmtEur(sel.upfrontTaxEur) },
            ].map((m) => (
              <div key={m.k} className="rounded-lg bg-white/10 px-3 py-2">
                <div className="text-lg font-bold">{m.v}</div>
                <div className="text-[11px] text-lake-100">{m.k}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-lake-200">
            House is ~{pct(houseShare)} of your ~{fmtEur(portfolioEur + inp.housePriceEur)} net worth · liquid figures exclude the (unsellable) house · planning model, not advice
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-7">
        <div className="rounded-xl border-l-4 border-lake-600 bg-white p-5 shadow-sm">
          {INTRO.split('\n\n').map((p, i) => (
            <p key={i} className="mb-2.5 text-sm leading-relaxed text-gray-700 last:mb-0">{p}</p>
          ))}
        </div>

        {/* Strategy comparison */}
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {STRATS.map((s) => {
            const r = results[s]
            const on = s === selected
            return (
              <button key={s} onClick={() => setSelected(s)} className={`rounded-xl border p-4 text-left transition ${on ? 'border-lake-600 bg-white shadow-md ring-1 ring-lake-600' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STRATEGY_COLOR[s] }} />{STRATEGY_LABEL[s]}</span>
                  {on && <span className="rounded-full bg-lake-600 px-2 py-0.5 text-[10px] font-medium text-white">shown</span>}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-gray-500">{STRATEGY_BLURB[s]}</p>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between"><dt className="text-gray-500">Upside (p90, total)</dt><dd className="font-medium text-emerald-700">{fmtEur(r.mc.terminal.p90)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Liquid median</dt><dd className="font-semibold text-gray-900">{fmtEur(r.mc.terminalLiquid.p50)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Liquid downside (p10)</dt><dd className="font-medium text-gray-700">{fmtEur(r.mc.terminalLiquid.p10)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Up-front tax</dt><dd className="font-medium text-gray-700">{fmtEur(r.upfrontTaxEur)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Debt at start</dt><dd className="font-medium text-gray-700">{fmtEur(r.deterministic[0].debtEur)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Run-dry risk</dt><dd className="font-medium text-gray-700">{pct(r.mc.ruinProb)}</dd></div>
                </dl>
              </button>
            )
          })}
        </div>

        {/* Cone chart */}
        <figure className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
          <figcaption className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-gray-800">
            <span>Net worth over time — {stackAll ? 'all strategies' : STRATEGY_LABEL[selected]} {busy && <span className="ml-1 text-[10px] font-normal text-gray-400">updating…</span>}</span>
            <label className="flex items-center gap-1.5 text-[11px] font-normal text-gray-600">
              <input type="checkbox" checked={stackAll} onChange={(e) => setStackAll(e.target.checked)} className="accent-lake-600" />
              Stack all strategies
            </label>
          </figcaption>
          <ConeChart mc={sel.mc} overlays={stackAll ? STRATS.map((s) => ({ color: STRATEGY_COLOR[s], arr: results[s].mc.p50 })) : undefined} />
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
            {stackAll
              ? STRATS.map((s) => <span key={s} className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: STRATEGY_COLOR[s] }} />{STRATEGY_LABEL[s]} median</span>)
              : <><span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-[#2b82a5] opacity-30" />10–90th pct</span><span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-[#1d6f8b]" />median (typical)</span></>}
            <span className="text-gray-400">· log scale, {inp.mcPaths.toLocaleString()} paths, total net worth incl. house</span>
          </div>
        </figure>

        {/* Composition chart */}
        <figure className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <figcaption className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-gray-800">
            <span>How net worth is split & grows — {STRATEGY_LABEL[selected]}, median path</span>
            <span className="flex flex-wrap items-center gap-2 text-[10px] font-normal text-gray-500">
              {COMP.map((c) => <span key={c.key} className="flex items-center gap-1"><span className="inline-block h-2 w-2.5 rounded-sm" style={{ background: c.color }} />{c.label}</span>)}
            </span>
          </figcaption>
          <CompositionChart rows={sel.deterministic} />
          <p className="mt-1 text-[10px] text-gray-400">
            Dashed line = net worth after debt. Turn up “Move SpaceX → diversified” below to watch the concentration shift into the safer bucket over time.
          </p>
        </figure>

        {/* Inputs */}
        <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900">Assumptions — change anything</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <Group title="House & strategy">
            <Num label="House price (all-in)" value={inp.housePriceEur} step={250000} suffix="€" onChange={(v) => set({ housePriceEur: v })} />
            <Num label="One-off setup / furnishing" value={inp.setupCapexEur} step={250000} suffix="€" onChange={(v) => set({ setupCapexEur: v })} />
            <Pct label="House appreciation" value={inp.houseGrowth} max={0.06} onChange={(v) => set({ houseGrowth: v })} />
            <label className="block">
              <span className="text-[11px] font-medium text-gray-600">Funding strategy (shown above)</span>
              <div className="mt-1 flex gap-1">
                {STRATS.map((s) => <button key={s} onClick={() => setSelected(s)} className={`flex-1 rounded-md px-1.5 py-1 text-[11px] font-medium ${s === selected ? 'bg-lake-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{STRATEGY_LABEL[s]}</button>)}
              </div>
            </label>
            <Pct label="Hybrid: share funded by selling" value={inp.hybridSellPct} max={1} onChange={(v) => set({ hybridSellPct: v })} />
            <Pct label="Diversify SpaceX now (one-time sale)" value={inp.spacexInitialDivPct} max={1} onChange={(v) => set({ spacexInitialDivPct: v })} />
            <Pct label="Move SpaceX → diversified / yr (de-risk)" value={inp.spacexTrimPct} max={0.25} onChange={(v) => set({ spacexTrimPct: v })} />
            {inp.spacexInitialDivPct > 0 && (
              <p className="rounded-md bg-lake-50 p-2 text-[11px] leading-snug text-lake-900 sm:col-span-2">
                One-time sale → <strong>{fmtEur(d0.div)}</strong> now in diversified. The $0-basis sale is taxed first (~{pct(inp.capGainsRate)}), so only the after-tax amount lands there — the tax shows up in “Up-front tax to buy.” At purchase: SpaceX {fmtEur(d0.spacex)} · Diversified {fmtEur(d0.div)}.
              </p>
            )}
          </Group>

          <Group title="Holdings (USD)">
            <Num label="SpaceX shares" value={inp.spacexShares} step={10000} onChange={(v) => set({ spacexShares: v })} />
            <Num label="SpaceX $/share" value={inp.spacexPrice} step={10} suffix="$" onChange={(v) => set({ spacexPrice: v })} />
            <Num label="SpaceX basis $/share" value={inp.spacexBasisPerShare} step={5} suffix="$" onChange={(v) => set({ spacexBasisPerShare: v })} />
            <Num label="Cash" value={inp.cashUsd} step={50000} suffix="$" onChange={(v) => set({ cashUsd: v })} />
            <Num label="TSLA value" value={inp.tslaValue} step={50000} suffix="$" onChange={(v) => set({ tslaValue: v })} />
            <Num label="TSLA cost basis" value={inp.tslaBasis} step={50000} suffix="$" onChange={(v) => set({ tslaBasis: v })} />
            <Num label="GOOG value" value={inp.googValue} step={25000} suffix="$" onChange={(v) => set({ googValue: v })} />
            <Num label="GOOG cost basis" value={inp.googBasis} step={25000} suffix="$" onChange={(v) => set({ googBasis: v })} />
          </Group>

          <Group title="Growth & volatility" cols={3} note="μ is the TYPICAL (median) annual return — single stocks sit below the index on purpose. Co-move = correlation² to the market (0–1).">
            <Pct label="SpaceX median return" value={inp.spacex.mu} max={0.2} onChange={(v) => setAsset('spacex', { mu: v })} />
            <Pct label="SpaceX vol" value={inp.spacex.sigma} max={0.9} onChange={(v) => setAsset('spacex', { sigma: v })} />
            <Pct label="SpaceX mkt co-move" value={inp.spacex.beta} max={1} onChange={(v) => setAsset('spacex', { beta: v })} />
            <Pct label="TSLA median return" value={inp.tsla.mu} max={0.2} onChange={(v) => setAsset('tsla', { mu: v })} />
            <Pct label="TSLA vol" value={inp.tsla.sigma} max={0.9} onChange={(v) => setAsset('tsla', { sigma: v })} />
            <Pct label="TSLA mkt co-move" value={inp.tsla.beta} max={1} onChange={(v) => setAsset('tsla', { beta: v })} />
            <Pct label="GOOG median return" value={inp.goog.mu} max={0.2} onChange={(v) => setAsset('goog', { mu: v })} />
            <Pct label="GOOG vol" value={inp.goog.sigma} max={0.9} onChange={(v) => setAsset('goog', { sigma: v })} />
            <Pct label="GOOG mkt co-move" value={inp.goog.beta} max={1} onChange={(v) => setAsset('goog', { beta: v })} />
            <Pct label="Diversified return" value={inp.div.mu} max={0.12} onChange={(v) => setAsset('div', { mu: v })} />
            <Pct label="Diversified vol" value={inp.div.sigma} max={0.4} onChange={(v) => setAsset('div', { sigma: v })} />
            <Pct label="Cash yield" value={inp.cashRate} max={0.08} onChange={(v) => set({ cashRate: v })} />
          </Group>

          <Group title="Risk model" note="Mean reversion caps long-horizon dispersion (0 = raw random walk, much wider tails). Impairment = the chance SpaceX permanently craters — the one risk a bell curve can't show.">
            <Pct label="Mean reversion" value={inp.meanReversion} max={0.3} onChange={(v) => set({ meanReversion: v })} />
            <Pct label="SpaceX impairment / yr" value={inp.impairProb} max={0.05} step={0.0025} onChange={(v) => set({ impairProb: v })} />
            <Pct label="…drops to" value={inp.impairTo} max={1} onChange={(v) => set({ impairTo: v })} />
            <Pct label="Wealth-tax scenario" value={inp.wealthTaxRate} max={0.02} step={0.0025} onChange={(v) => set({ wealthTaxRate: v })} />
          </Group>

          <Group title="Tax, FX & loans">
            <Pct label="Cap-gains rate (DE 26.4% +NIIT = 30.2%)" value={inp.capGainsRate} max={0.4} onChange={(v) => set({ capGainsRate: v })} />
            <Num label="EUR/USD (USD per €)" value={inp.eurUsd} step={0.01} onChange={(v) => set({ eurUsd: v })} />
            <Pct label="EUR/USD volatility" value={inp.fxVol} max={0.2} onChange={(v) => set({ fxVol: v })} />
            <Pct label="EUR drift vs USD" value={inp.fxDrift} max={0.04} onChange={(v) => set({ fxDrift: v })} />
            <Pct label="Mortgage LTV" value={inp.mortgageLtv} max={0.8} onChange={(v) => set({ mortgageLtv: v })} />
            <Pct label="Mortgage rate" value={inp.mortgageRate} max={0.08} onChange={(v) => set({ mortgageRate: v })} />
            <Pct label="Portfolio-loan max LTV" value={inp.sblocMaxLtv} max={0.7} onChange={(v) => set({ sblocMaxLtv: v })} />
            <Pct label="Portfolio-loan rate" value={inp.sblocRate} max={0.12} onChange={(v) => set({ sblocRate: v })} />
            <label className="block sm:col-span-2">
              <span className="flex justify-between text-[11px] font-medium text-gray-600">
                <span>Loan repayment time <span className="text-gray-400">(borrow / hybrid only)</span></span>
                <span className="tabular-nums text-gray-500">{inp.loanTermYears > 30 ? 'never — interest-only' : `pay off in ${inp.loanTermYears} yr`}</span>
              </span>
              <input type="range" min={1} max={31} step={1} value={inp.loanTermYears} onChange={(e) => set({ loanTermYears: Number(e.target.value) })} className="mt-1 w-full accent-lake-600" />
            </label>
          </Group>

          <Group title="Living costs (€/yr)">
            <Num label="House running costs" value={inp.burnHouseOps} step={5000} suffix="€" onChange={(v) => set({ burnHouseOps: v })} />
            <Num label="Schooling" value={inp.burnSchooling} step={5000} suffix="€" onChange={(v) => set({ burnSchooling: v })} />
            <Num label="Childcare / nanny" value={inp.burnChildcare} step={5000} suffix="€" onChange={(v) => set({ burnChildcare: v })} />
            <Num label="Health insurance" value={inp.burnHealth} step={2500} suffix="€" onChange={(v) => set({ burnHealth: v })} />
            <Num label="Property/liability insurance" value={inp.burnInsurance} step={5000} suffix="€" onChange={(v) => set({ burnInsurance: v })} />
            <Num label="Cross-border tax & advisory" value={inp.burnAdvisory} step={5000} suffix="€" onChange={(v) => set({ burnAdvisory: v })} />
            <Num label="General living" value={inp.burnGeneral} step={10000} suffix="€" onChange={(v) => set({ burnGeneral: v })} />
            <Num label="Travel" value={inp.burnTravel} step={5000} suffix="€" onChange={(v) => set({ burnTravel: v })} />
            <div className="flex items-center justify-between rounded-md bg-lake-50 px-3 py-2 text-sm sm:col-span-2">
              <span className="font-medium text-lake-900">Total living costs</span>
              <span className="font-semibold tabular-nums text-lake-900">{fmtEur(burnTotal)}/yr <span className="font-normal text-lake-700">(€{Math.round(burnTotal / 12 / 1000)}k/mo, before {pct(inp.inflation)} inflation)</span></span>
            </div>
            <Pct label="Inflation" value={inp.inflation} max={0.06} onChange={(v) => set({ inflation: v })} />
          </Group>

          <Group title="Simulation">
            <Num label="Horizon (years)" value={inp.horizon} step={1} onChange={(v) => set({ horizon: Math.max(5, Math.min(50, Math.round(v))) })} />
            <Num label="Monte Carlo paths" value={inp.mcPaths} step={500} onChange={(v) => set({ mcPaths: Math.max(200, Math.min(8000, Math.round(v))) })} />
            <button onClick={() => setInp(DEFAULTS)} className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 sm:col-span-2">↺ Reset to defaults</button>
          </Group>
        </div>

        {/* Assumptions & sources */}
        <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900">Method, caveats & sources</h2>
        <ul className="space-y-1.5 text-sm text-gray-700">
          {ASSUMPTIONS.map((a, i) => (
            <li key={i} className="flex gap-2"><span className="text-lake-500">•</span>{a}</li>
          ))}
        </ul>
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
          This is a planning model, audited for internal consistency — not tax or investment advice. For a $0-basis concentrated position at this scale, confirm the numbers with a cross-border (US + German) advisor before acting.
        </p>
        <ol className="mt-3 grid gap-1 text-xs text-gray-500 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <li key={s.n}><span className="text-gray-400">[{s.n}]</span>{' '}<a href={s.url} target="_blank" rel="noreferrer" className="text-lake-600 hover:underline">{s.title} ↗</a></li>
          ))}
        </ol>
        <button onClick={onBack} className="mt-6 rounded-md bg-lake-600 px-4 py-2 text-sm font-medium text-white hover:bg-lake-700">← Back to the guide</button>
      </div>
    </div>
  )
}
