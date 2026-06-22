#!/usr/bin/env python3
"""Compute travel-time isochrones from the house and write static GeoJSON.

Pure-Python, no API key and no Java: downloads the OSM street network around
Reitweg 25 with OSMnx, assigns per-mode edge travel times, and for each band
(10/30/60 min) takes the network-reachable nodes and wraps them in a concave hull.

Modes: walk, bike, ebike (faster bike), drive. Output:
  public/data/isochrones/{mode}-{band}.geojson

Run inside the venv:  tools/.venv/bin/python tools/build_isochrones.py
"""
from __future__ import annotations

import json
from pathlib import Path

import networkx as nx
import osmnx as ox
import shapely
from pyproj import Transformer
from shapely.geometry import MultiPoint, mapping
from shapely.ops import transform as shp_transform

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "isochrones"
HOME = (47.8606705, 11.2919095)  # lat, lng
BANDS = [5, 10, 15, 30, 45, 60]

# network_type, uniform speed (km/h) or None to use OSM maxspeed, download radius (m)
MODES = {
    "walk": ("walk", 4.8, 6500),
    "bike": ("bike", 16.0, 20000),
    "ebike": ("bike", 19.0, 26000),
    "drive": ("drive", None, 80000),  # free-flow from OSM maxspeeds — matches Google directions
}
HULL_RATIO = 0.35  # lower = tighter/jaggier concave hull


def add_travel_times(G, speed_kph):
    if speed_kph is None:  # drive: use OSM maxspeed with sensible fallbacks
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
        return G
    mps = speed_kph * 1000 / 3600
    for _, _, data in G.edges(data=True):
        data["travel_time"] = data["length"] / mps
    return G


def band_polygon(Gp, center, minutes, to_wgs):
    sub = nx.ego_graph(Gp, center, radius=minutes * 60, distance="travel_time")
    pts = MultiPoint([(d["x"], d["y"]) for _, d in sub.nodes(data=True)])
    if pts.is_empty or len(sub) < 3:
        return None
    hull = shapely.concave_hull(pts, ratio=HULL_RATIO)
    # Close small gaps and smooth slightly (meters, projected CRS).
    poly = hull.buffer(60).buffer(-25).simplify(15)
    return shp_transform(to_wgs, poly)


def build_mode(mode: str, network_type: str, speed_kph, dist: int):
    print(f"[{mode}] downloading {network_type} network within {dist/1000:.0f} km …")
    G = ox.graph_from_point(HOME, dist=dist, network_type=network_type, simplify=True)
    G = add_travel_times(G, speed_kph)
    center = ox.distance.nearest_nodes(G, X=HOME[1], Y=HOME[0])
    Gp = ox.project_graph(G)
    to_wgs = Transformer.from_crs(Gp.graph["crs"], "EPSG:4326", always_xy=True).transform
    print(f"[{mode}] {len(G)} nodes; building bands …")
    for band in BANDS:
        poly = band_polygon(Gp, center, band, to_wgs)
        if poly is None:
            print(f"  ! {mode}-{band}: empty")
            continue
        fc = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"mode": mode, "band": band},
                    "geometry": mapping(poly),
                }
            ],
        }
        (OUT / f"{mode}-{band}.geojson").write_text(json.dumps(fc))
        print(f"  ✓ {mode}-{band}.geojson")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for mode, (ntype, speed, dist) in MODES.items():
        try:
            build_mode(mode, ntype, speed, dist)
        except Exception as exc:
            print(f"[{mode}] FAILED: {exc}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
