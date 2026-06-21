#!/usr/bin/env python3
"""Geocode the curated place seed into public/data/places.json.

Reads tools/places.seed.json. For entries without explicit lat/lng, geocodes via
OpenStreetMap Nominatim (1 req/sec, cached by entry id). Nominatim handles
"Name, Town" far better than "Name, Street, City", so we try a few candidate
queries and prefer a real POI over a same-named bus stop / road. Results outside
the expected Starnberger See / Munich / Alps bbox are flagged for a human to fix.

Usage: python3 tools/geocode_places.py
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "tools" / "places.seed.json"
OUT = ROOT / "public" / "data" / "places.json"
CACHE = ROOT / "tools" / ".geocode-cache.json"

BBOX = (47.3, 48.35, 10.8, 11.85)  # (min_lat, max_lat, min_lon, max_lon)
UA = "bernried-guide/1.0 (tuchel@gmail.com)"
DEPRIORITIZE = {"highway", "railway"}  # bus stops / rail points named after a POI


def load_cache() -> dict:
    return json.loads(CACHE.read_text()) if CACHE.exists() else {}


def save_cache(cache: dict) -> None:
    CACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False))


def in_bbox(lat: float, lng: float) -> bool:
    return BBOX[0] <= lat <= BBOX[1] and BBOX[2] <= lng <= BBOX[3]


def nominatim(query: str) -> list:
    params = urllib.parse.urlencode(
        {"q": query, "format": "json", "limit": 5, "countrycodes": "de", "addressdetails": 0}
    )
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
    except Exception as exc:
        print(f"  ! request failed for {query!r}: {exc}", file=sys.stderr)
        data = []
    time.sleep(1.1)  # Nominatim usage policy: max 1 req/sec
    return data


def pick(results: list) -> dict | None:
    """Prefer an in-bbox result that is not a road/transit feature."""
    in_box = [r for r in results if in_bbox(float(r["lat"]), float(r["lon"]))]
    if not in_box:
        return None
    preferred = [r for r in in_box if r.get("class") not in DEPRIORITIZE]
    r = (preferred or in_box)[0]
    return {"lat": float(r["lat"]), "lng": float(r["lon"])}


# Disambiguate / normalize town names Nominatim is picky about.
TOWN_NORM = {"Munich": "München", "Bernried": "Bernried am Starnberger See"}
STREET_RE = re.compile(r"(straße|strasse|platz|weg|promenade|allee|ring|insel)", re.I)


def clean_name(name: str) -> str:
    base = re.sub(r"\(.*?\)", "", name)  # drop "(...)"
    base = re.split(r"[—–]", base)[0]  # drop " — suffix"
    return base.strip(" ,-")


def parenthetical(name: str) -> str | None:
    m = re.search(r"\((.*?)\)", name)
    return m.group(1).strip() if m else None


def street_of(query: str | None) -> str | None:
    if not query:
        return None
    for chunk in query.split(","):
        c = chunk.strip()
        if re.search(r"\d", c) or STREET_RE.search(c):
            return c
    return None


def candidates(entry: dict) -> list[str]:
    town = TOWN_NORM.get(entry["town"], entry["town"])
    name = entry["name"]
    cn, pn, st = clean_name(name), parenthetical(name), street_of(entry.get("query"))
    raw = [
        f"{cn}, {town}",
        f"{pn}, {town}" if pn else None,
        f"{st}, {town}" if st else None,
        entry.get("query"),
        f"{cn} {town}",
    ]
    out, seen = [], set()
    for c in raw:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def geocode_entry(entry: dict, cache: dict) -> dict | None:
    if cache.get(entry["id"]):  # retry past failures (cached as null)
        return cache[entry["id"]]
    result = None
    for cand in candidates(entry):
        result = pick(nominatim(cand))
        if result:
            break
    cache[entry["id"]] = result
    save_cache(cache)
    return result


def main() -> int:
    seed = json.loads(SEED.read_text())
    cache = load_cache()
    out, flags = [], []
    for entry in seed:
        lat, lng = entry.get("lat"), entry.get("lng")
        if lat is None or lng is None:
            res = geocode_entry(entry, cache)
            if not res:
                flags.append(f"NO RESULT: {entry['id']} ({entry.get('query','')})")
                continue
            lat, lng = res["lat"], res["lng"]
        if not in_bbox(lat, lng):
            flags.append(f"OUT OF BBOX: {entry['id']} -> {lat:.4f},{lng:.4f}")
        out.append(
            {
                "id": entry["id"],
                "name": entry["name"],
                "category": entry["category"],
                "town": entry["town"],
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "blurb": entry["blurb"],
                "tags": entry.get("tags", []),
                "standout": entry.get("standout", False),
                "seasonal": entry.get("seasonal", False),
                "googleQuery": entry.get("query", f"{entry['name']}, {entry['town']}"),
                "placeId": entry.get("placeId"),
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(out)} / {len(seed)} places to {OUT.relative_to(ROOT)}")
    if flags:
        print("\nFLAGS (review these):")
        for f in flags:
            print("  -", f)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
