import { COMPS, TIERS, TOWN_BENCHMARKS, TREND } from './data'

const eur = (n: number) => '€' + n.toLocaleString('en-US')
const eurK = (n: number) => '€' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k'

function ChartFrame({
  title,
  sub,
  height,
  children,
}: {
  title: string
  sub?: string
  height: number
  children: React.ReactNode
}) {
  return (
    <figure className="my-5 rounded-xl border border-gray-200 bg-white p-4">
      <figcaption className="mb-2">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
      </figcaption>
      <svg viewBox={`0 0 640 ${height}`} width="100%" height="auto" role="img" aria-label={title}>
        {children}
      </svg>
    </figure>
  )
}

/** West-bank town house asking €/m² — Bernried is the cheapest. */
export function BenchmarkBars() {
  const rows = TOWN_BENCHMARKS
  const rowH = 30
  const top = 8
  const x0 = 92
  const w = 510
  const max = 10_000
  const height = top + rows.length * rowH + 24
  return (
    <ChartFrame
      title="Ordinary house asking prices — west-bank towns"
      sub="€/m² living area, 2025–26 (immoverkauf24 / Engel & Völkers). Bernried is the lowest of the seven."
      height={height}
    >
      {[2_500, 5_000, 7_500, 10_000].map((g) => {
        const x = x0 + (g / max) * w
        return (
          <g key={g}>
            <line x1={x} y1={top} x2={x} y2={top + rows.length * rowH} stroke="#eef2f4" />
            <text x={x} y={height - 8} fontSize="9" fill="#9ca3af" textAnchor="middle">{eurK(g)}</text>
          </g>
        )
      })}
      {rows.map((r, i) => {
        const y = top + i * rowH
        const bw = (r.perM2 / max) * w
        const hl = r.town === 'Bernried'
        return (
          <g key={r.town}>
            <text x={x0 - 6} y={y + rowH / 2 + 3} fontSize="11" fill="#374151" textAnchor="end">{r.town}</text>
            <rect x={x0} y={y + 6} width={bw} height={rowH - 12} rx="2" fill={hl ? '#245772' : '#7cc1d8'} />
            <text x={x0 + bw + 5} y={y + rowH / 2 + 3} fontSize="10" fill={hl ? '#245772' : '#6b7280'} fontWeight={hl ? 700 : 400}>
              {eur(r.perM2)}
            </text>
          </g>
        )
      })}
    </ChartFrame>
  )
}

/** Comparable villas — €/m² on living area, subject highlighted. */
export function CompsBars() {
  const rows = [...COMPS].sort((a, b) => a.perM2 - b.perM2)
  const rowH = 34
  const top = 8
  const x0 = 150
  const w = 410
  const max = 36_000
  const height = top + rows.length * rowH + 24
  return (
    <ChartFrame
      title="Comparable villas — price per m² of living area"
      sub="Active asking prices, west-bank Starnberger See, Jun 2026. The subject sits at the top of the renovated near-lake cluster, below land-heavy heritage outliers."
      height={height}
    >
      {[10_000, 20_000, 30_000].map((g) => {
        const x = x0 + (g / max) * w
        return (
          <g key={g}>
            <line x1={x} y1={top} x2={x} y2={top + rows.length * rowH} stroke="#eef2f4" />
            <text x={x} y={height - 8} fontSize="9" fill="#9ca3af" textAnchor="middle">{eurK(g)}</text>
          </g>
        )
      })}
      {rows.map((r, i) => {
        const y = top + i * rowH
        const bw = (r.perM2 / max) * w
        const color = r.subject ? '#245772' : r.outlier ? '#d1d5db' : '#7cc1d8'
        return (
          <g key={r.town + r.price}>
            <text x={4} y={y + rowH / 2 - 1} fontSize="11" fill="#374151" fontWeight={r.subject ? 700 : 400}>
              {r.town}{r.subject ? ' ★' : ''}
            </text>
            <text x={4} y={y + rowH / 2 + 11} fontSize="8.5" fill="#9ca3af">
              {(r.price / 1_000_000).toFixed(2)}M · {r.livingM2} m² · {r.proximity}
            </text>
            <rect x={x0} y={y + 7} width={bw} height={rowH - 15} rx="2" fill={color} />
            <text x={x0 + bw + 5} y={y + rowH / 2 + 2} fontSize="9.5" fill={r.subject ? '#245772' : '#6b7280'} fontWeight={r.subject ? 700 : 400}>
              {eur(r.perM2)}
            </text>
          </g>
        )
      })}
    </ChartFrame>
  )
}

/** Starnberg house asking €/m² — the rate-cycle correction and recovery. */
export function TrendLine() {
  const data = TREND
  const top = 16
  const left = 44
  const w = 560
  const h = 150
  const max = 10_000
  const min = 7_000
  const x = (i: number) => left + (i / (data.length - 1)) * w
  const y = (v: number) => top + (1 - (v - min) / (max - min)) * h
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.perM2)}`).join(' ')
  const height = top + h + 40
  return (
    <ChartFrame
      title="Market timing — Starnberg house prices through the rate shock"
      sub="Asking €/m², Engel & Völkers Starnberg. Prime lakeside corrected less and recovered faster than the −8.4% national 2023 fall."
      height={height}
    >
      {[7_000, 8_000, 9_000, 10_000].map((g) => (
        <g key={g}>
          <line x1={left} y1={y(g)} x2={left + w} y2={y(g)} stroke="#eef2f4" />
          <text x={left - 6} y={y(g) + 3} fontSize="9" fill="#9ca3af" textAnchor="end">{eurK(g)}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#245772" strokeWidth="2.5" />
      {data.map((d, i) => (
        <g key={d.year}>
          <circle cx={x(i)} cy={y(d.perM2)} r={d.label ? 4 : 3} fill="#245772" />
          <text x={x(i)} y={top + h + 16} fontSize="9.5" fill="#6b7280" textAnchor="middle">{d.year}</text>
          {d.label && (
            <text x={x(i)} y={y(d.perM2) - 9} fontSize="9" fill="#245772" textAnchor="middle" fontWeight="600">{d.label}</text>
          )}
        </g>
      ))}
    </ChartFrame>
  )
}

/** Where the subject's €/m² sits across market tiers. */
export function PositioningBar() {
  const left = 8
  const w = 624
  const min = 4_000
  const max = 22_000
  const scale = (v: number) => left + ((v - min) / (max - min)) * w
  const bandY = 64
  const bandH = 26
  const height = 178
  const markers = [
    { v: 12_484, label: 'Subject · usable area', color: '#245772', up: true },
    { v: 19_980, label: 'Subject · living area', color: '#b91c1c', up: false },
  ]
  return (
    <ChartFrame
      title="Where the €9.75M ask positions the villa"
      sub="€/m² of living area. On living area it prices into the waterfront-trophy tier it doesn't occupy; on usable area it sits inside the near-lake luxury band."
      height={height}
    >
      {TIERS.map((t) => {
        const x1 = scale(Math.max(t.lo, min))
        const x2 = scale(Math.min(t.hi, max))
        return (
          <g key={t.label}>
            <rect x={x1} y={bandY} width={x2 - x1} height={bandH} fill={t.color} opacity="0.85" />
            <text x={(x1 + x2) / 2} y={bandY + bandH + 13} fontSize="8.5" fill="#6b7280" textAnchor="middle">
              <tspan>{t.label}</tspan>
            </text>
            <text x={(x1 + x2) / 2} y={bandY + bandH + 24} fontSize="8" fill="#9ca3af" textAnchor="middle">
              {eurK(t.lo)}–{eurK(t.hi)}
            </text>
          </g>
        )
      })}
      {markers.map((m) => {
        const mx = scale(m.v)
        const valY = m.up ? bandY - 22 : bandY + bandH + 52
        const labY = m.up ? bandY - 11 : bandY + bandH + 63
        return (
          <g key={m.label}>
            <line x1={mx} y1={m.up ? bandY - 8 : bandY + bandH} x2={mx} y2={m.up ? bandY : bandY + bandH + 8} stroke={m.color} strokeWidth="2" />
            <circle cx={mx} cy={m.up ? bandY : bandY + bandH} r="3.5" fill={m.color} />
            <text x={mx} y={valY} fontSize="10" fill={m.color} textAnchor="middle" fontWeight="700">{eur(m.v)}</text>
            <text x={mx} y={labY} fontSize="8.5" fill={m.color} textAnchor="middle">{m.label}</text>
          </g>
        )
      })}
    </ChartFrame>
  )
}
