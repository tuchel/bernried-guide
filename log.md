# bernried-guide — log

Dated, append-only. `## [YYYY-MM-DD] {kind} | {what} | {result}`

## [2026-06-21] setup | scaffold | Vite+React+TS+Tailwind app, MapLibre fallback basemap centered on Reitweg 25 (47.8607, 11.2919); dev server + production build verified via preview screenshot.
## [2026-06-21] research | connectivity verified | Direct hourly RB66 Bernried→München Hbf ~36–39 min (exposé undersold as ~60 min bus+rail); MUC ~84 km/~60 min drive; A95 ~13 km (Seeshaupt jct). Sources saved to notes/.
## [2026-06-21] research | curation + tech | ~60 great family destinations sampled; Google ToS forces Google base map for live Places (store place_id only); road isochrones via OSMnx (no key/Java), transit pragmatic.
## [2026-06-21] build | datasets | 83 curated places geocoded via Nominatim (tools/places.seed.json → geocode_places.py); connectivity.json + quiet.json with sourced facts; family essentials as map markers (school/kita/health).
## [2026-06-21] build | isochrones | OSMnx road isochrones walk/bike/ebike (concave-hull, 10/30/60 min) + approximate transit (station-reachability). Needs scikit-learn for nearest_nodes. Drive (80 km) long-running. Output public/data/isochrones/.
## [2026-06-21] build | app | Map (MapLibre/OpenFreeMap base, no key), category-filtered markers, isochrone toggles + legend, detail panel (curated + Google deep-links), 3 lens dashboards (connectivity/quiet/family). Verified in preview. Live Google Places + deploy pending user key/repo.
