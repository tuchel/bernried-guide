import type { Band, CategoryId, TransportMode } from './types'

/** The property under evaluation — exact OSM geocode of Reitweg 25. */
export const HOME = {
  lat: 47.8606705,
  lng: 11.2919095,
  label: 'Reitweg 25',
  address: 'Reitweg 25, 82347 Bernried am Starnberger See',
}

/** Domain-restricted browser key, injected at build via VITE_GOOGLE_MAPS_API_KEY. */
export const GOOGLE_MAPS_API_KEY: string | undefined = import.meta.env
  .VITE_GOOGLE_MAPS_API_KEY

/** Optional cloud Map ID for custom Google styling (advanced-marker support). */
export const GOOGLE_MAP_ID: string | undefined = import.meta.env.VITE_GOOGLE_MAP_ID

export const MAP_DEFAULTS = { center: { lat: HOME.lat, lng: HOME.lng }, zoom: 12 }

export interface CategoryMeta {
  label: string
  emoji: string
  color: string
  group: 'Daily life' | 'Fun & outings' | 'Day trips' | 'Family essentials'
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  grocery: { label: 'Groceries & markets', emoji: '🛒', color: '#e07a5f', group: 'Daily life' },
  playground: { label: 'Playgrounds', emoji: '🛝', color: '#f2a541', group: 'Daily life' },
  icecream: { label: 'Ice cream', emoji: '🍦', color: '#f4a3c0', group: 'Daily life' },
  pizza: { label: 'Pizza', emoji: '🍕', color: '#d1495b', group: 'Daily life' },
  restaurant: { label: 'Restaurants', emoji: '🍽️', color: '#c1666b', group: 'Daily life' },
  beergarten: { label: 'Beer gardens', emoji: '🍺', color: '#e6b800', group: 'Daily life' },
  park: { label: 'Parks & nature', emoji: '🌳', color: '#5a8f4a', group: 'Fun & outings' },
  swimming: { label: 'Swimming spots', emoji: '🏊', color: '#2b82a5', group: 'Fun & outings' },
  fishing: { label: 'Fishing', emoji: '🎣', color: '#3d7068', group: 'Fun & outings' },
  marina: { label: 'Boats & sailing', emoji: '⛵', color: '#1d6f8b', group: 'Fun & outings' },
  farm: { label: 'Farms to visit', emoji: '🐄', color: '#a87c4f', group: 'Fun & outings' },
  zoo: { label: 'Zoos & animals', emoji: '🦌', color: '#7a9e3f', group: 'Fun & outings' },
  bike: { label: 'Bike routes', emoji: '🚲', color: '#4c956c', group: 'Fun & outings' },
  kids: { label: 'Kids activities', emoji: '🎠', color: '#9b5de5', group: 'Fun & outings' },
  munich: { label: 'Munich day trips', emoji: '🏙️', color: '#5c6b73', group: 'Day trips' },
  alps: { label: 'Alpine day trips', emoji: '🏔️', color: '#6c8ea0', group: 'Day trips' },
  school: { label: 'Schools', emoji: '🎓', color: '#3d5a80', group: 'Family essentials' },
  kita: { label: 'Kitas & kindergartens', emoji: '🧸', color: '#8e7dbe', group: 'Family essentials' },
  health: { label: 'Health & care', emoji: '🏥', color: '#c44536', group: 'Family essentials' },
}

export const CATEGORY_GROUPS: CategoryMeta['group'][] = [
  'Daily life',
  'Fun & outings',
  'Day trips',
  'Family essentials',
]

export interface ModeMeta {
  label: string
  emoji: string
  /** Color ramp base for the isochrone fill. */
  color: string
  note: string
}

export const MODES: Record<TransportMode, ModeMeta> = {
  walk: { label: 'Walk', emoji: '🚶', color: '#2b82a5', note: 'On foot' },
  bike: { label: 'Bike', emoji: '🚲', color: '#4c956c', note: 'Standard bicycle' },
  ebike: { label: 'E-bike', emoji: '⚡', color: '#7a9e3f', note: 'Pedelec, ~18 km/h' },
  drive: { label: 'Drive', emoji: '🚗', color: '#e07a5f', note: 'Free-flow car' },
  transit: { label: 'Transit', emoji: '🚆', color: '#9b5de5', note: 'Train + bus, weekday morning' },
}

export const BANDS: Band[] = [5, 10, 15, 30, 45, 60]

/** Sequential green→red ramp by travel-time band: near = green, far = deep red. */
export const BAND_COLOR: Record<Band, string> = {
  5: '#16a34a', // green
  10: '#65a30d', // lime
  15: '#ca8a04', // gold
  30: '#ea580c', // orange
  45: '#dc2626', // red
  60: '#7f1d1d', // deep red
}
