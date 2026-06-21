import { useEffect, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Place } from '../types'

// Fields we render. Requesting `reviews`/`photos` bills at the Enterprise SKU, so
// this hook only runs on demand (when a place is selected) — never on page load.
const FIELDS = [
  'displayName',
  'formattedAddress',
  'rating',
  'userRatingCount',
  'googleMapsURI',
  'regularOpeningHours',
  'photos',
  'reviews',
]

export interface LivePlace {
  rating?: number
  userRatingCount?: number
  googleMapsURI?: string
  photos: { uri: string; attribution?: { displayName?: string; uri?: string } }[]
  reviews: {
    rating?: number
    text?: string
    when?: string
    author?: { displayName?: string; uri?: string; photoURI?: string }
  }[]
  openToday?: string
  weekdayHours?: string[]
}

/** Fetch live Google photos/rating/reviews for a selected place (place_id, or text search). */
export function usePlaceDetails(place: Place | null) {
  const placesLib = useMapsLibrary('places')
  const [data, setData] = useState<LivePlace | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!placesLib || !place) {
      setData(null)
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    setData(null)

    ;(async () => {
      let p: google.maps.places.Place | undefined
      if (place.placeId) {
        p = new placesLib.Place({ id: place.placeId })
        await p.fetchFields({ fields: FIELDS })
      } else {
        const res = await placesLib.Place.searchByText({
          textQuery: place.googleQuery || `${place.name}, ${place.town}`,
          fields: FIELDS,
          maxResultCount: 1,
          locationBias: { lat: place.lat, lng: place.lng },
          language: 'en',
          region: 'de',
        })
        p = res.places?.[0]
      }
      if (!p) throw new Error('not found')

      const today = new Date().getDay() // 0=Sun
      const weekday = p.regularOpeningHours?.weekdayDescriptions ?? []
      // Google's array is Mon..Sun; map JS Sun=0 → index 6, Mon=1 → 0, etc.
      const idx = (today + 6) % 7

      const live: LivePlace = {
        rating: p.rating ?? undefined,
        userRatingCount: p.userRatingCount ?? undefined,
        googleMapsURI: p.googleMapsURI ?? undefined,
        photos: (p.photos ?? []).slice(0, 6).map((ph) => ({
          uri: ph.getURI({ maxWidth: 800 }),
          attribution: ph.authorAttributions?.[0]
            ? {
                displayName: ph.authorAttributions[0].displayName ?? undefined,
                uri: ph.authorAttributions[0].uri ?? undefined,
              }
            : undefined,
        })),
        reviews: (p.reviews ?? []).slice(0, 3).map((r) => ({
          rating: r.rating ?? undefined,
          text: r.text ?? undefined,
          when: r.relativePublishTimeDescription ?? undefined,
          author: r.authorAttribution
            ? {
                displayName: r.authorAttribution.displayName ?? undefined,
                uri: r.authorAttribution.uri ?? undefined,
                photoURI: r.authorAttribution.photoURI ?? undefined,
              }
            : undefined,
        })),
        weekdayHours: weekday,
        openToday: weekday[idx],
      }
      if (alive) setData(live)
    })()
      .catch((e) => alive && setError(String(e?.message ?? e)))
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [placesLib, place])

  return { data, loading, error }
}
