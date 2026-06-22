#!/usr/bin/env python3
"""Generate road isochrones from Google's Isochrones API (Preview) → static GeoJSON.

Replaces the OSMnx walk/bike/drive isochrones with Google's. Driving uses
TRAFFIC_AWARE routing (the reason to bother). Google's Isochrones API supports only
WALK, BICYCLE and DRIVE — no transit, no e-bike — so e-bike (OSMnx) and transit
(station approximation) are intentionally left untouched.

Prereqs: the Isochrones API enabled on the project, and a key in the environment.
Run:  GOOGLE_MAPS_API_KEY=<key> python3 tools/build_isochrones_google.py
(stdlib only — no venv needed)
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

try:
    # Clean the (very dense) raw polygons so the boundary LINE reads clearly: drop
    # interior holes (unreachable pockets like the lake render as noisy extra loops),
    # drop tiny disjoint islands, and simplify. Keeps the outer travel-time contour.
    from shapely.geometry import MultiPolygon, Polygon, mapping, shape

    HAVE_SHAPELY = True
except ImportError:
    HAVE_SHAPELY = False

SIMPLIFY_TOL = 0.0006  # degrees, ~65 m
MIN_ISLAND_AREA = 3e-6  # deg^2 (~ (190 m)^2); drop specks


def clean_geometry(geom: dict) -> dict:
    if not HAVE_SHAPELY:
        return geom
    g = shape(geom)

    def outer(p: Polygon) -> Polygon:
        return Polygon(p.exterior)  # drop interior holes

    if g.geom_type == "Polygon":
        g = outer(g)
    elif g.geom_type == "MultiPolygon":
        parts = [outer(p) for p in g.geoms if p.area >= MIN_ISLAND_AREA]
        g = parts[0] if len(parts) == 1 else MultiPolygon(parts) if parts else outer(max(g.geoms, key=lambda p: p.area))
    g = g.simplify(SIMPLIFY_TOL, preserve_topology=True)
    return mapping(g)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "isochrones"
HOME = {"latitude": 47.8606705, "longitude": 11.2919095}
ENDPOINT = "https://isochrones.googleapis.com/v1/isochrones:generate"
KEY = os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get("VITE_GOOGLE_MAPS_API_KEY")
# The key is HTTP-referrer restricted; send an allowed referrer for build-time calls.
REFERER = os.environ.get("BUILD_REFERER", "https://tuchel.github.io/bernried-guide/")

BANDS = [10, 30, 60]
# app mode → Google travelMode. Bike is intentionally EXCLUDED: Google's Isochrones
# API (Preview) BICYCLE profile models a conservative ~10–12 km/h on roads — far
# slower than Google Maps cycling directions (e.g. Bernried→Tutzing 7.7 km in 24 min,
# net-downhill ≈19 km/h), so it under-reaches. Bike + e-bike use OSMnx instead
# (build_isochrones.py) at realistic speeds. Walk + drive (traffic-aware) stay Google.
MODES = {"walk": "WALK", "drive": "DRIVE"}


def extract_geometry(geojson: dict) -> dict:
    """Normalize whatever GeoJSON shape Google returns to a single geometry object."""
    t = geojson.get("type")
    if t == "FeatureCollection":
        geoms = [f["geometry"] for f in geojson.get("features", []) if f.get("geometry")]
        if len(geoms) == 1:
            return geoms[0]
        return {"type": "GeometryCollection", "geometries": geoms}
    if t == "Feature":
        return geojson["geometry"]
    return geojson  # already a Polygon / MultiPolygon / GeometryCollection


def generate(mode: str, gmode: str, band: int) -> None:
    body = {
        "location": HOME,  # proto oneof member sits at top level (no "origin" wrapper)
        "travelMode": gmode,
        "travelDirection": "FROM",
        "travelDuration": f"{band * 60}s",
        "enableSmoothing": True,
        "polygonFidelity": "HIGH",
    }
    if gmode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": KEY,
            "X-Goog-FieldMask": "isochrone.geoJson",
            "Referer": REFERER,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        data = json.load(r)
    geom = clean_geometry(extract_geometry(data["isochrone"]["geoJson"]))
    fc = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"mode": mode, "band": band, "source": "google"}, "geometry": geom}
        ],
    }
    (OUT / f"{mode}-{band}.geojson").write_text(json.dumps(fc))
    print(f"  ✓ {mode}-{band}.geojson ({geom.get('type')})")


def main() -> int:
    if not KEY:
        print("Set GOOGLE_MAPS_API_KEY (or VITE_GOOGLE_MAPS_API_KEY) in the environment.")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for mode, gmode in MODES.items():
        for band in BANDS:
            try:
                generate(mode, gmode, band)
                time.sleep(0.3)
            except urllib.error.HTTPError as e:
                print(f"  ! {mode}-{band}: HTTP {e.code} — {e.read().decode()[:240]}")
            except Exception as e:  # noqa: BLE001
                print(f"  ! {mode}-{band}: {e}")
    print("Done. (e-bike stays OSMnx; transit stays the station approximation.)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
