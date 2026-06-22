#!/usr/bin/env python3
"""Approximate public-transit isochrones → static GeoJSON.

A true schedule-accurate transit isochrone needs GTFS + a routing engine (Java).
As a clearly-labeled approximation we model what a family actually does: walk to
Bernried station, ride the hourly RB66, walk out at the destination. For each band
we union a real STREET-NETWORK walkshed around the home (sized by the band) with
walksheds around the stations reachable within that many minutes door-to-door —
organic shapes, not circles. In a rural area on an hourly line the reachable
regions are genuinely disconnected; that is honest, and labeled in the UI.

Run: tools/.venv/bin/python tools/build_transit_isochrones.py
"""
from __future__ import annotations

import json
import warnings
from pathlib import Path

import networkx as nx
import osmnx as ox
import shapely
from pyproj import Transformer
from shapely.geometry import MultiPoint, Polygon, mapping
from shapely.ops import transform as shp_transform
from shapely.ops import unary_union

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "isochrones"
HOME = (47.8606705, 11.2919095)
WALK_KMH = 4.8
STATION_WALK_MIN = 8  # walk-out radius at a destination station
HULL_RATIO = 0.3
INF = float("inf")

# name, lat, lng, door-to-door minutes from the house by transit (access + ride)
STATIONS = [
    ("Seeshaupt", 47.8389, 11.3060, 25),
    ("Tutzing", 47.9089, 11.2806, 25),
    ("Penzberg", 47.7546, 11.3760, 30),
    ("Iffeldorf", 47.7780, 11.3290, 40),
    ("Starnberg", 47.9960, 11.3457, 50),
    ("Weilheim", 47.8401, 11.1426, 50),
    ("Kochel", 47.6602, 11.3640, 55),
    ("München Hbf", 48.1402, 11.5586, 55),
]

_cache: dict = {}


def walkshed(lat: float, lng: float, minutes: int):
    """Street-network walk isochrone polygon (in EPSG:4326) for `minutes` of walking."""
    key = (round(lat, 5), round(lng, 5), minutes)
    if key in _cache:
        return _cache[key]
    dist = int(minutes / 60 * WALK_KMH * 1000 * 1.5 + 250)
    G = ox.graph_from_point((lat, lng), dist=dist, network_type="walk", simplify=True)
    mps = WALK_KMH * 1000 / 3600
    for _, _, d in G.edges(data=True):
        d["travel_time"] = d["length"] / mps
    center = ox.distance.nearest_nodes(G, X=lng, Y=lat)
    Gp = ox.project_graph(G)
    to_wgs = Transformer.from_crs(Gp.graph["crs"], "EPSG:4326", always_xy=True).transform
    budget = minutes * 60
    times = nx.single_source_dijkstra_path_length(Gp, center, cutoff=budget, weight="travel_time")
    coords = [(Gp.nodes[n]["x"], Gp.nodes[n]["y"]) for n in times]
    for u, t_u in times.items():
        ux, uy = Gp.nodes[u]["x"], Gp.nodes[u]["y"]
        remaining = budget - t_u
        for v in Gp.successors(u):
            if times.get(v, INF) <= budget:
                continue
            tt = min(d.get("travel_time", INF) for d in Gp.get_edge_data(u, v).values())
            if 0 < tt < INF:
                f = min(1.0, remaining / tt)
                coords.append((ux + f * (Gp.nodes[v]["x"] - ux), uy + f * (Gp.nodes[v]["y"] - uy)))
    if len(coords) < 3:
        _cache[key] = None
        return None
    poly = shapely.concave_hull(MultiPoint(coords), ratio=HULL_RATIO)
    poly = poly.buffer(70, join_style=1).buffer(-40, join_style=1).simplify(12).buffer(0)
    if poly.geom_type == "MultiPolygon":
        poly = max(poly.geoms, key=lambda p: p.area)
    poly = Polygon(poly.exterior)  # drop holes
    res = shp_transform(to_wgs, poly)
    _cache[key] = res
    return res


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for band in (5, 10, 15, 30, 45, 60):
        parts = []
        hw = walkshed(HOME[0], HOME[1], min(band, 15))
        if hw:
            parts.append(hw)
        for _, lat, lng, d in STATIONS:
            if d <= band:
                w = walkshed(lat, lng, STATION_WALK_MIN)
                if w:
                    parts.append(w)
        if not parts:
            (OUT / f"transit-{band}.geojson").write_text('{"type":"FeatureCollection","features":[]}')
            print(f"  · transit-{band}.geojson (empty)")
            continue
        poly = unary_union(parts)
        fc = {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "properties": {"mode": "transit", "band": band, "approximate": True}, "geometry": mapping(poly)}
            ],
        }
        (OUT / f"transit-{band}.geojson").write_text(json.dumps(fc))
        print(f"  ✓ transit-{band}.geojson  ({len(parts)} walksheds)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
