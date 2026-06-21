// Shared data model for the Bernried family guide.

export type CategoryId =
  // Daily life
  | 'grocery'
  | 'playground'
  | 'icecream'
  | 'pizza'
  | 'restaurant'
  | 'beergarten'
  // Fun & outings (close to home)
  | 'park'
  | 'swimming'
  | 'fishing'
  | 'marina'
  | 'farm'
  | 'zoo'
  | 'bike'
  | 'kids'
  // Day trips
  | 'munich'
  | 'alps'
  // Family essentials ("can we live here?")
  | 'school'
  | 'kita'
  | 'health'

export type TransportMode = 'walk' | 'bike' | 'ebike' | 'drive' | 'transit'

export type Band = 10 | 30 | 60

export interface Place {
  id: string
  name: string
  category: CategoryId
  town: string
  lat: number
  lng: number
  /** Why it's great, especially for a family with young kids. */
  blurb: string
  /** Free-form tags: season, indoor/outdoor, age-fit, etc. */
  tags?: string[]
  /** True for the handful of genuine standouts. */
  standout?: boolean
  /** Text query used to deep-link / resolve a Google Place. */
  googleQuery?: string
  /** Google Place ID — resolved later via tools/resolve_place_ids. */
  placeId?: string | null
  /** Official website, if any. */
  url?: string
  /** Seasonal venues (e.g. lake lidos open Easter–Oct). */
  seasonal?: boolean
}

/** A single source-backed fact shown in the relocation lens panels. */
export interface Fact {
  label: string
  value: string
  detail?: string
  source?: { title: string; url: string }
}

export interface ConnectivityContext {
  intro: string
  facts: Fact[]
}

export interface QuietContext {
  intro: string
  facts: Fact[]
}

export interface EssentialItem {
  name: string
  kind: string
  town: string
  lat?: number
  lng?: number
  note?: string
  minutesFromHome?: number
  url?: string
}

export interface FamilyEssentials {
  intro: string
  groups: { title: string; items: EssentialItem[] }[]
}
