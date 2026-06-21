# bernried-guide

A map-based family guidebook for **Reitweg 25, 82347 Bernried am Starnberger See** —
built to help decide whether to buy the house, by making its daily life and
connectivity legible. Centered on the property, it overlays travel-time isochrones
(walk / bike / e-bike / drive / transit at 10/30/60 min) and a curated, high-signal
set of great family destinations, plus relocation "lenses" (family essentials,
connectivity & escape, quiet/seclusion).

## Goal & success criteria

- Goal: a polished, shareable web + mobile guide that answers "could an LA family
  thrive here, and how quiet/connected is this house?"
- Done when: isochrones render for every mode/band centered on the house; curated
  places show live Google photos/reviews on click; the three lens dashboards read
  off verified, sourced numbers; deployed to a public GitHub Pages site.

## Stack

Vite + React + TypeScript + Tailwind v4. Map via `@vis.gl/react-google-maps`
(Google base map, required by Google ToS to show live Places content), with a
keyless **MapLibre + OpenFreeMap** fallback that renders whenever no Google key is
configured. Isochrones are precomputed offline and shipped as static GeoJSON.

## Layout

- `src/` — the app. `config.ts` (home coords, categories, modes), `types.ts`,
  `components/` (map, filters, detail panel, lens panels).
- `public/data/` — runtime data: `places.json`, `context/*.json`, `isochrones/*.geojson`.
- `tools/` — build-time scripts (isochrones, place_id resolution).
- `notes/` — research + sources backing the curated content.
- `log.md` — dated project log.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
```

Set `VITE_GOOGLE_MAPS_API_KEY` (and optionally `VITE_GOOGLE_MAP_ID`) in `.env.local`
to switch the base map to Google and enable live Places. Without it, the app runs on
the MapLibre preview basemap.

## Deploy

Built `dist/` is published to a dedicated **public** repo `bernried-guide` via GitHub
Actions (Pages), served at `/bernried-guide/` with a `noindex` tag. The exposé and
notes stay in the private parent repo.
