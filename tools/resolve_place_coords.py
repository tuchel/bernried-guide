#!/usr/bin/env python3
"""Snap curated places to precise Google Places coordinates + place_ids.

Geographic-accuracy pass: replaces Nominatim/manual coordinates (some of which were
street- or town-level) with Google's exact venue location, and stores the place_id
(so the live detail panel fetches by id instead of a text search). Skips 'bike' route
placeholders (not real POIs). Any Google match >4 km from the current point is treated
as a likely mismatch and KEPT as-is (flagged for review).

Run: GOOGLE_MAPS_API_KEY=<key> tools/.venv/bin/python tools/resolve_place_coords.py
"""
from __future__ import annotations

import json
import math
import os
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLACES = ROOT / "public" / "data" / "places.json"
KEY = os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get("VITE_GOOGLE_MAPS_API_KEY")
REFERER = os.environ.get("BUILD_REFERER", "https://tuchel.github.io/bernried-guide/")
ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
MAX_MOVE_KM = 4.0


def km(a, b):
    dlat = (a[0] - b[0]) * 111.0
    dlng = (a[1] - b[1]) * math.cos(math.radians(a[0])) * 111.0
    return (dlat**2 + dlng**2) ** 0.5


def search(query, lat, lng):
    body = {
        "textQuery": query,
        "maxResultCount": 1,
        "languageCode": "en",
        "regionCode": "de",
        "locationBias": {"circle": {"center": {"latitude": lat, "longitude": lng}, "radius": 4000.0}},
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": KEY,
            "X-Goog-FieldMask": "places.id,places.location,places.displayName",
            "Referer": REFERER,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.load(r)
    p = (data.get("places") or [None])[0]
    if not p:
        return None
    loc = p["location"]
    return p["id"], loc["latitude"], loc["longitude"], p.get("displayName", {}).get("text", "")


def main() -> int:
    if not KEY:
        print("Set GOOGLE_MAPS_API_KEY")
        return 1
    places = json.loads(PLACES.read_text())
    moved, flagged, skipped, resolved = [], [], 0, 0
    for p in places:
        if p["category"] == "bike":  # route placeholders, not POIs
            skipped += 1
            continue
        query = p.get("googleQuery") or f'{p["name"]}, {p["town"]}'
        try:
            res = search(query, p["lat"], p["lng"])
        except Exception as e:  # noqa: BLE001
            flagged.append(f"{p['id']}: ERROR {e}")
            continue
        time.sleep(0.2)
        if not res:
            flagged.append(f"{p['id']}: no Google result")
            continue
        pid, glat, glng, gname = res
        dist = km((p["lat"], p["lng"]), (glat, glng))
        if dist > MAX_MOVE_KM:
            flagged.append(f"{p['id']}: Google '{gname}' is {dist:.1f} km away — KEPT current")
            continue
        if dist > 0.04:
            moved.append((dist, f"{p['id']}: +{dist * 1000:.0f} m → {gname}"))
        p["lat"], p["lng"], p["placeId"] = round(glat, 6), round(glng, 6), pid
        resolved += 1

    PLACES.write_text(json.dumps(places, indent=2, ensure_ascii=False) + "\n")
    print(f"Resolved {resolved} places to Google coords (+place_ids); skipped {skipped} bike routes.")
    moved.sort(reverse=True)
    print(f"\nMoved >40 m ({len(moved)}):")
    for _, m in moved:
        print("  -", m)
    if flagged:
        print(f"\nFlagged / unchanged ({len(flagged)}):")
        for f in flagged:
            print("  -", f)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
