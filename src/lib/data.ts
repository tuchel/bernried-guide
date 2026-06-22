import { useEffect, useState } from 'react'
import type { ConnectivityContext, Place, QuietContext } from '../types'

/** Resolve a path under public/, honoring the Vite base (/ in dev, /bernried-guide/ in prod). */
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}

export function isochroneUrl(mode: string, band: number): string {
  return asset(`data/isochrones/${mode}-${band}.geojson`)
}

type Loadable<T> = { data: T | null; loading: boolean; error: string | null }

function useJson<T>(path: string): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({
    data: null,
    loading: true,
    error: null,
  })
  useEffect(() => {
    let alive = true
    fetch(asset(path))
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((e) => alive && setState({ data: null, loading: false, error: String(e) }))
    return () => {
      alive = false
    }
  }, [path])
  return state
}

export interface TransitInfo {
  assumption: string
  access: string
  lines: { line: string; headway: string; detail: string }[]
}

export const usePlaces = () => useJson<Place[]>('data/places.json')
export const useConnectivity = () => useJson<ConnectivityContext>('data/context/connectivity.json')
export const useQuiet = () => useJson<QuietContext>('data/context/quiet.json')
export const useTransit = () => useJson<TransitInfo>('data/context/transit.json')
