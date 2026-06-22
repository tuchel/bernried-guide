import type { Band, TransportMode } from '../types'
import { BAND_COLOR, BANDS, MODES } from '../config'
import { useTransit } from '../lib/data'

export function Legend({ mode, bands }: { mode: TransportMode; bands: Set<Band> }) {
  const meta = MODES[mode]
  const shown = BANDS.filter((b) => bands.has(b))
  const transit = useTransit()
  return (
    <div className="pointer-events-none absolute bottom-7 left-2 z-10 max-w-[15rem] rounded-lg bg-white/95 px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold text-gray-700">
        {meta.emoji} {meta.label} · travel time
      </div>
      <div className="flex flex-col gap-1">
        {shown.map((b) => (
          <div key={b} className="flex items-center gap-2">
            <span
              className="inline-block w-6"
              style={{ height: 0, borderTop: `3px solid ${BAND_COLOR[b]}` }}
            />
            <span className="text-gray-600">within {b} min</span>
          </div>
        ))}
      </div>

      {mode === 'transit' && transit.data && (
        <div className="mt-2 border-t border-gray-100 pt-1.5">
          <div className="mb-0.5 text-[11px] font-semibold text-gray-700">Service frequency</div>
          {transit.data.lines.map((l) => (
            <div key={l.line} className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] text-gray-600">{l.line}</span>
              <span className="whitespace-nowrap text-[10px] font-semibold text-lake-700">{l.headway}</span>
            </div>
          ))}
          <p className="mt-1 text-[9.5px] leading-snug text-gray-400">{transit.data.access}</p>
          <p className="mt-0.5 text-[9.5px] leading-snug text-gray-400">{transit.data.assumption}</p>
        </div>
      )}
    </div>
  )
}
