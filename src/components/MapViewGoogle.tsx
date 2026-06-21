import { useEffect, useRef } from 'react'
import { AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps'
import type { Band, CategoryId, Place, TransportMode } from '../types'
import { BAND_OPACITY, CATEGORIES, GOOGLE_MAP_ID, HOME, MAP_DEFAULTS, MODES } from '../config'
import { isochroneUrl } from '../lib/data'

interface Props {
  places: Place[]
  activeCategories: Set<CategoryId>
  mode: TransportMode | null
  bands: Set<Band>
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/** Draws the active isochrone GeoJSON onto the Google map via a Data layer. */
function GoogleIsochrones({ mode, bands }: { mode: TransportMode | null; bands: Set<Band> }) {
  const map = useMap()
  const dataRef = useRef<google.maps.Data | null>(null)

  useEffect(() => {
    if (!map) return
    const data = new google.maps.Data()
    data.setMap(map)
    data.setStyle((f) => {
      const m = f.getProperty('mode') as TransportMode
      const b = f.getProperty('band') as Band
      return {
        fillColor: MODES[m]?.color ?? '#2b82a5',
        fillOpacity: BAND_OPACITY[b] ?? 0.2,
        strokeColor: MODES[m]?.color ?? '#2b82a5',
        strokeOpacity: 0.5,
        strokeWeight: 1,
        clickable: false,
      }
    })
    dataRef.current = data
    return () => {
      data.setMap(null)
      dataRef.current = null
    }
  }, [map])

  useEffect(() => {
    const data = dataRef.current
    if (!data) return
    data.forEach((f) => data.remove(f))
    if (!mode) return
    const ordered = [...bands].sort((a, b) => b - a) // big band first
    ordered.forEach((b) => {
      fetch(isochroneUrl(mode, b))
        .then((r) => (r.ok ? r.json() : null))
        .then((gj) => gj && dataRef.current?.addGeoJson(gj))
        .catch(() => {})
    })
  }, [mode, bands])

  return null
}

function Pin({ place, selected }: { place: Place; selected: boolean }) {
  const meta = CATEGORIES[place.category]
  return (
    <div className={`place-marker${place.standout ? ' is-standout' : ''}${selected ? ' is-selected' : ''}`}>
      <div className="pin" style={{ background: meta.color }}>
        {meta.emoji}
      </div>
    </div>
  )
}

export function MapViewGoogle({
  places,
  activeCategories,
  mode,
  bands,
  selectedId,
  onSelect,
}: Props) {
  return (
    <Map
      mapId={GOOGLE_MAP_ID || 'DEMO_MAP_ID'}
      defaultCenter={MAP_DEFAULTS.center}
      defaultZoom={MAP_DEFAULTS.zoom}
      gestureHandling="greedy"
      clickableIcons={false}
      disableDefaultUI={false}
      onClick={() => onSelect(null)}
    >
      <AdvancedMarker position={{ lat: HOME.lat, lng: HOME.lng }} title={HOME.address} zIndex={20}>
        <div className="place-marker is-home">
          <div className="pin">🏡</div>
        </div>
      </AdvancedMarker>

      {places
        .filter((p) => activeCategories.has(p.category))
        .map((p) => (
          <AdvancedMarker
            key={p.id}
            position={{ lat: p.lat, lng: p.lng }}
            zIndex={selectedId === p.id ? 15 : 1}
            onClick={() => onSelect(p.id)}
          >
            <Pin place={p} selected={selectedId === p.id} />
          </AdvancedMarker>
        ))}

      <GoogleIsochrones mode={mode} bands={bands} />
    </Map>
  )
}
