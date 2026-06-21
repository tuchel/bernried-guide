import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Band, CategoryId, Place, TransportMode } from '../types'
import { BAND_OPACITY, CATEGORIES, HOME, MAP_DEFAULTS, MODES } from '../config'
import { isochroneUrl } from '../lib/data'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

interface Props {
  places: Place[]
  activeCategories: Set<CategoryId>
  mode: TransportMode | null
  bands: Set<Band>
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function makeEl(html: string, className: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = className
  el.innerHTML = html
  return el
}

function placeMarkerEl(place: Place): HTMLDivElement {
  const meta = CATEGORIES[place.category]
  const el = makeEl(
    `<div class="pin" style="background:${meta.color}">${meta.emoji}</div>`,
    `place-marker${place.standout ? ' is-standout' : ''}`,
  )
  el.dataset.cat = place.category
  el.title = place.name
  return el
}

export function MapView({
  places,
  activeCategories,
  mode,
  bands,
  selectedId,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const readyRef = useRef(false)
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const isoLayersRef = useRef<Set<string>>(new Set())
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [MAP_DEFAULTS.center.lng, MAP_DEFAULTS.center.lat],
      zoom: MAP_DEFAULTS.zoom,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const home = makeEl(
      `<div class="pin home">🏡</div>`,
      'place-marker is-home',
    )
    home.title = HOME.address
    new maplibregl.Marker({ element: home, anchor: 'bottom' })
      .setLngLat([HOME.lng, HOME.lat])
      .addTo(map)

    map.on('load', () => {
      readyRef.current = true
      map.resize()
      // Trigger a re-sync of data-driven layers now that the style is ready.
      map.fire('app:ready')
    })
    // Click on empty map deselects.
    map.on('click', () => onSelectRef.current(null))

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      readyRef.current = false
      markersRef.current.clear()
      isoLayersRef.current.clear()
    }
  }, [])

  // Sync place markers when the list changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    // Remove stale.
    for (const [id, m] of markers) {
      if (!places.find((p) => p.id === id)) {
        m.remove()
        markers.delete(id)
      }
    }
    // Add new.
    for (const p of places) {
      if (markers.has(p.id)) continue
      const el = placeMarkerEl(p)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        onSelectRef.current(p.id)
      })
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([p.lng, p.lat])
        .addTo(map)
      markers.set(p.id, marker)
    }
  }, [places])

  // Apply category filter + selection styling to markers.
  useEffect(() => {
    const markers = markersRef.current
    for (const p of places) {
      const m = markers.get(p.id)
      if (!m) continue
      const el = m.getElement()
      el.style.display = activeCategories.has(p.category) ? '' : 'none'
      el.classList.toggle('is-selected', p.id === selectedId)
    }
  }, [places, activeCategories, selectedId])

  // Pan to the selected place.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const p = places.find((x) => x.id === selectedId)
    if (p) map.easeTo({ center: [p.lng, p.lat], duration: 500 })
  }, [selectedId, places])

  // Reconcile isochrone layers when mode/bands change.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const sync = () => {
      if (!readyRef.current) return
      const desired = mode ? [...bands].map((b) => `${mode}-${b}`) : []
      const live = isoLayersRef.current
      // Remove unwanted layers + sources.
      for (const key of [...live]) {
        if (!desired.includes(key)) {
          const fill = `iso-fill-${key}`
          const line = `iso-line-${key}`
          if (map.getLayer(fill)) map.removeLayer(fill)
          if (map.getLayer(line)) map.removeLayer(line)
          if (map.getSource(`iso-${key}`)) map.removeSource(`iso-${key}`)
          live.delete(key)
        }
      }
      // Add desired (largest band first so smaller bands paint on top).
      const ordered = [...desired].sort(
        (a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]),
      )
      for (const key of ordered) {
        if (live.has(key)) continue
        const [m, bStr] = key.split('-')
        const band = Number(bStr) as Band
        const src = `iso-${key}`
        map.addSource(src, { type: 'geojson', data: isochroneUrl(m, band) })
        map.addLayer({
          id: `iso-fill-${key}`,
          type: 'fill',
          source: src,
          paint: {
            'fill-color': MODES[m as TransportMode].color,
            'fill-opacity': BAND_OPACITY[band],
          },
        })
        map.addLayer({
          id: `iso-line-${key}`,
          type: 'line',
          source: src,
          paint: {
            'line-color': MODES[m as TransportMode].color,
            'line-width': 1.2,
            'line-opacity': 0.5,
          },
        })
        live.add(key)
      }
    }
    if (readyRef.current) sync()
    else map.once('app:ready', sync)
  }, [mode, bands])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
