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
from shapely.geometry import MultiPoint, Polygon, mapping
from shapely.ops import transform as shp_transform
from shapely.ops import unary_union

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
HULL_RATIO = 0.45  # higher = smoother blob (consumer-isochrone look) rather than branchy road-arms
INF = float("inf")
MIN_ISLAND_AREA = 60_000  # m^2 (~245 m square): drop specks


def clean(poly):
    """A simple outer envelope: valid, no interior holes, no tiny islands — so the
    boundary renders as clean nested rings, not a web of internal edges."""
    poly = poly.buffer(0)  # repair self-intersections
    parts = list(poly.geoms) if poly.geom_type == "MultiPolygon" else [poly]
    parts = [Polygon(p.exterior) for p in parts if p.geom_type == "Polygon" and p.area >= MIN_ISLAND_AREA]
    if not parts:
        return None
    return parts[0] if len(parts) == 1 else unary_union(parts)


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
    budget = minutes * 60
    times = nx.single_source_dijkstra_path_length(Gp, center, cutoff=budget, weight="travel_time")
    if len(times) < 3:
        return None
    coords = [(Gp.nodes[n]["x"], Gp.nodes[n]["y"]) for n in times]
    # True isochrone boundary: interpolate the point on each edge leaving a reachable
    # node where the time budget runs out. Densifies the boundary (smoother) and makes
    # it follow the roads to where you actually stop (more accurate) — not back to the
    # last junction.
    for u, t_u in times.items():
        ux, uy = Gp.nodes[u]["x"], Gp.nodes[u]["y"]
        remaining = budget - t_u
        for v in Gp.successors(u):
            if times.get(v, INF) <= budget:
                continue  # edge fully inside the reachable area
            tt = min(d.get("travel_time", INF) for d in Gp.get_edge_data(u, v).values())
            if not (0 < tt < INF):
                continue
            frac = min(1.0, remaining / tt)
            coords.append((ux + frac * (Gp.nodes[v]["x"] - ux), uy + frac * (Gp.nodes[v]["y"] - uy)))
    hull = shapely.concave_hull(MultiPoint(coords), ratio=HULL_RATIO)
    # Bridge between nearby road-arms and round into a smooth envelope (expand-then-
    # contract), then reduce to a clean outer ring — no interior edges, no branchy web.
    poly = clean(hull.buffer(260, join_style=1).buffer(-220, join_style=1).simplify(18))
    return None if (poly is None or poly.is_empty) else shp_transform(to_wgs, poly)


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
