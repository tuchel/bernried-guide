import type { Band, TransportMode } from '../types'
import { BAND_COLOR, BANDS, MODES } from '../config'

export function Legend({ mode, bands }: { mode: TransportMode; bands: Set<Band> }) {
  const meta = MODES[mode]
  const shown = BANDS.filter((b) => bands.has(b))
  return (
    <div className="pointer-events-none absolute bottom-7 left-2 z-10 rounded-lg bg-white/95 px-3 py-2 text-xs shadow-md">
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
      {mode === 'transit' && (
        <div className="mt-1 max-w-[12rem] text-[10px] leading-snug text-gray-400">
          Approximate: walk to the station + hourly RB66 + walk out. Regions can be
          disconnected — that's real.
        </div>
      )}
    </div>
  )
}
