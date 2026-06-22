#!/usr/bin/env python3
"""Schedule-accurate(ish) public-transit isochrones from the house → static GeoJSON.

Model (assumption stated in the UI): you *time your arrival* to the train, so there
is no wait for your first departure, and connections are timed. The travel time to a
station is therefore the ~14-min walk from the house to Bernried station + the real
in-vehicle ride time (+ a short platform change for transfers). Service FREQUENCY is
surfaced separately in the app, because a 5-min ride on an hourly line is a very
different thing than on a 10-min line.

Reachable stations and their arrival time FROM THE HOUSE are curated from the real
timetable: RB66 Kochelseebahn is hourly, Bernried→München Hbf ~36 min; S6 (change at
Tutzing) ~every 20 min. For each band we union a walkshed around the home (sized by
the band, capped at the 14-min access walk) with an 8-min walkshed around every
station reachable within that many minutes. Disconnected regions are real.

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
ACCESS_WALK_MIN = 14  # house → Bernried station on foot
STATION_WALK_MIN = 8  # egress walk radius at a destination station
HULL_RATIO = 0.45
INF = float("inf")

# Reachable rail stations: name, lat, lng, arrival minutes FROM THE HOUSE
# (= 14-min access walk + real ride time + ~3-min transfer where a change is needed).
STATIONS = [
    ("Seeshaupt", 47.8256, 11.3064, 19),       # RB66 south
    ("Penzberg", 47.7530, 11.3730, 27),         # RB66 south
    ("Bichl", 47.7180, 11.4130, 32),            # RB66 south
    ("Benediktbeuern", 47.7050, 11.4170, 35),   # RB66 south
    ("Kochel", 47.6620, 11.3590, 39),           # RB66 south (terminus)
    ("Tutzing", 47.9089, 11.2806, 22),          # RB66 north
    ("Feldafing", 47.9360, 11.2960, 28),        # S6 via Tutzing
    ("Possenhofen", 47.9530, 11.3050, 30),      # S6 via Tutzing
    ("Starnberg", 47.9970, 11.3430, 30),        # RB66 direct
    ("Gauting", 48.0680, 11.3770, 40),          # S6 via Tutzing
    ("Weilheim", 47.8380, 11.1530, 39),         # RB6 via Tutzing
    ("Murnau", 47.6810, 11.2030, 49),           # RB6 via Tutzing
    ("München-Pasing", 48.1500, 11.4610, 42),   # RB66 direct
    ("München Hbf", 48.1402, 11.5586, 50),      # RB66 direct
    ("München Marienplatz", 48.1374, 11.5755, 56),  # + S-Bahn trunk
]

_cache: dict = {}


def walkshed(lat: float, lng: float, minutes: int):
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
    poly = poly.buffer(120, join_style=1).buffer(-90, join_style=1).simplify(12).buffer(0)
    if poly.geom_type == "MultiPolygon":
        poly = max(poly.geoms, key=lambda p: p.area)
    poly = Polygon(poly.exterior)
    res = shp_transform(to_wgs, poly)
    _cache[key] = res
    return res


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for band in (5, 10, 15, 30, 45, 60):
        parts = []
        hw = walkshed(HOME[0], HOME[1], min(band, ACCESS_WALK_MIN))
        if hw:
            parts.append(hw)
        for name, lat, lng, arrival in STATIONS:
            if arrival <= band:
                w = walkshed(lat, lng, STATION_WALK_MIN)
                if w:
                    parts.append(w)
        poly = unary_union(parts) if parts else None
        if poly is None:
            (OUT / f"transit-{band}.geojson").write_text('{"type":"FeatureCollection","features":[]}')
            print(f"  · transit-{band}.geojson (empty)")
            continue
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
