#!/usr/bin/env python3
"""Approximate public-transit isochrones from the house → static GeoJSON.

A true schedule-accurate transit isochrone needs GTFS + a routing engine (r5/OTP,
i.e. Java). As a clearly-labeled approximation we model the realistic thing a
family actually does: walk to Bernried station, ride the hourly RB66, walk out at
the destination. Each band is the union of a home walkshed plus a walk-out radius
around the stations reachable within that many minutes (door-to-door, weekday
daytime). Because rail here is hourly, bands are lumpy and the regions can be
disconnected — that is honest, not a bug.

Output: public/data/isochrones/transit-{band}.geojson
Run:    tools/.venv/bin/python tools/build_transit_isochrones.py
"""
from __future__ import annotations

import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import Point, mapping
from shapely.ops import transform as shp_transform
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "isochrones"
HOME = (47.8606705, 11.2919095)  # lat, lng

to_m = Transformer.from_crs("EPSG:4326", "EPSG:32632", always_xy=True).transform
to_deg = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True).transform

# station: (lat, lng, min door-to-door minutes from the house by transit)
STATIONS = [
    ("Seeshaupt", 47.8389, 11.3060, 25),
    ("Tutzing", 47.9089, 11.2806, 25),
    ("Penzberg", 47.7546, 11.3760, 30),
    ("Starnberg", 47.9960, 11.3457, 50),
    ("Weilheim", 47.8401, 11.1426, 50),
    ("Iffeldorf", 47.7780, 11.3290, 40),
    ("Kochel", 47.6602, 11.3640, 55),
    ("München Hbf", 48.1402, 11.5586, 55),
]
STATION_WALK_M = 700  # walk-out radius at a destination station


def buffered_deg(lat: float, lng: float, radius_m: float):
    p = shp_transform(to_m, Point(lng, lat)).buffer(radius_m)
    return shp_transform(to_deg, p)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for band in (5, 10, 15, 30, 45, 60):
        # Home walkshed grows with the band but caps ~1 km (you'd walk ≤15 min to a station).
        home_walk = min(band, 15) * 70
        parts = [buffered_deg(HOME[0], HOME[1], home_walk)]
        for _, lat, lng, mins in STATIONS:
            if mins <= band:
                parts.append(buffered_deg(lat, lng, STATION_WALK_M))
        poly = unary_union(parts)
        fc = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"mode": "transit", "band": band, "approximate": True},
                    "geometry": mapping(poly),
                }
            ],
        }
        (OUT / f"transit-{band}.geojson").write_text(json.dumps(fc))
        print(f"  ✓ transit-{band}.geojson")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
