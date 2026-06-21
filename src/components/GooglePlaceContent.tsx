import type { Place } from '../types'
import { usePlaceDetails } from '../lib/googlePlaces'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} stars`}>
      {'★'.repeat(Math.round(rating))}
      <span className="text-gray-300">{'★'.repeat(5 - Math.round(rating))}</span>
    </span>
  )
}

/** Live Google photos/rating/reviews for the selected place. Only mount when a key exists. */
export function GooglePlaceContent({ place }: { place: Place }) {
  const { data, loading, error } = usePlaceDetails(place)

  if (loading) return <div className="py-2 text-xs text-gray-400">Loading Google details…</div>
  if (error || !data)
    return null // fall back silently to the curated content + deep links

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3">
      {data.rating != null && (
        <div className="flex items-center gap-2 text-sm">
          <Stars rating={data.rating} />
          <span className="font-medium text-gray-700">{data.rating.toFixed(1)}</span>
          {data.userRatingCount != null && (
            <span className="text-xs text-gray-400">({data.userRatingCount.toLocaleString()})</span>
          )}
          <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-300">Google</span>
        </div>
      )}

      {data.photos.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1">
          {data.photos.map((ph, i) => (
            <img
              key={i}
              src={ph.uri}
              alt={`${place.name} photo ${i + 1}`}
              loading="lazy"
              className="h-28 w-40 shrink-0 rounded-lg object-cover"
              title={ph.attribution?.displayName ? `© ${ph.attribution.displayName}` : undefined}
            />
          ))}
        </div>
      )}

      {data.openToday && (
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-600">Today:</span> {data.openToday}
        </p>
      )}

      {data.reviews.length > 0 && (
        <div className="space-y-2">
          {data.reviews.map((r, i) => (
            <div key={i} className="rounded-lg bg-gray-50 p-2.5">
              <div className="mb-0.5 flex items-center gap-2 text-xs">
                {r.author?.uri ? (
                  <a href={r.author.uri} target="_blank" rel="noreferrer" className="font-medium text-gray-700 hover:underline">
                    {r.author.displayName ?? 'Google user'}
                  </a>
                ) : (
                  <span className="font-medium text-gray-700">{r.author?.displayName ?? 'Google user'}</span>
                )}
                {r.rating != null && <Stars rating={r.rating} />}
                {r.when && <span className="ml-auto text-[10px] text-gray-400">{r.when}</span>}
              </div>
              {r.text && <p className="line-clamp-4 text-xs leading-relaxed text-gray-600">{r.text}</p>}
            </div>
          ))}
          <p className="text-[10px] text-gray-400">Ratings &amp; reviews via Google</p>
        </div>
      )}
    </div>
  )
}
