import type { Place } from '../types'
import { CATEGORIES, HOME } from '../config'
import { GooglePlaceContent } from './GooglePlaceContent'

function googleMapsUrl(place: Place): string {
  const query = encodeURIComponent(place.googleQuery || `${place.name}, ${place.town}`)
  const pid = place.placeId ? `&query_place_id=${place.placeId}` : ''
  return `https://www.google.com/maps/search/?api=1&query=${query}${pid}`
}

function directionsUrl(place: Place): string {
  const origin = `${HOME.lat},${HOME.lng}`
  const dest = `${place.lat},${place.lng}`
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`
}

export function DetailPanel({
  place,
  onClose,
  showLive = false,
}: {
  place: Place
  onClose: () => void
  showLive?: boolean
}) {
  const meta = CATEGORIES[place.category]
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div
        className="flex items-start gap-3 p-4 text-white"
        style={{ background: meta.color }}
      >
        <div className="text-2xl leading-none">{meta.emoji}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-snug">{place.name}</h2>
          <p className="text-xs opacity-90">
            {meta.label} · {place.town}
            {place.standout && ' · ⭐ standout'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-black/15 px-2 py-0.5 text-sm hover:bg-black/30"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 p-4">
        <p className="text-sm leading-relaxed text-gray-700">{place.blurb}</p>

        {(place.tags?.length || place.seasonal) && (
          <div className="flex flex-wrap gap-1.5">
            {place.seasonal && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                seasonal
              </span>
            )}
            {place.tags?.map((t) => (
              <span
                key={t}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {showLive && <GooglePlaceContent key={place.id} place={place} />}

        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={googleMapsUrl(place)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-lake-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lake-700"
          >
            View on Google Maps ↗
          </a>
          <a
            href={directionsUrl(place)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400"
          >
            Directions from home
          </a>
        </div>
      </div>
    </div>
  )
}
