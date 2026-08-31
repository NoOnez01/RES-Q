#!/usr/bin/env python3
"""Imports NDEMS units (from idem_units, already synced by
sync_idem_units.py) into ResQ's own rescue_teams/rescue_vehicles tables, so
dispatch can actually assign a case to one of these real units instead of
only the 3 seed demo teams.

Important limitations, by design (never fabricated to fill the gap):
  - idem_units has no per-unit coordinates, only a province -- each
    imported team's base is that province's centroid (same approximation
    used by the unit-search page), and base_address says so explicitly.
  - idem_units has no phone number for a unit -- phone is left as an empty
    string, not a fabricated number.
  - idem_units gives vehicle-level COUNTS (e.g. bls=3), not individual
    vehicle records with real crew/equipment -- this creates that many
    synthetic vehicle rows per level, each with a placeder 2-person crew
    (DEFAULT_CREW_SIZE below) and no equipment tags.
  - Creating an org row does NOT create a login -- a real person from that
    unit registers via /register/rescue, which already lists every
    existing rescue_teams row in its "หน่วยกู้ชีพ" dropdown (see
    RegisterRescue.tsx) and can pick their real unit instead of creating a
    new one. Until someone does, the imported org has no user attached and
    won't be able to act on an assigned case in-app.
  - Units with zero vehicles across BLS/ALS/CLS are skipped -- there would
    be nothing for dispatch to actually assign.

All imported rows use the id prefix "ndems-" (e.g. ndems-81-1-DEP-10,
never colliding with the app's own "rt-NN" sequence) specifically so this
is trivially reversible:
    delete from rescue_vehicles where rescue_team_id like 'ndems-%';
    delete from rescue_teams where id like 'ndems-%';

Usage:
    python scripts/import_ndems_org_shells.py                # nationwide
    python scripts/import_ndems_org_shells.py เชียงใหม่        # one province only
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

import requests

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
UPSERT_CHUNK_SIZE = 500
DEFAULT_CREW_SIZE = 2

# Same 77-province centroid table the unit-search page uses, duplicated
# here rather than imported (this is a standalone ops script, not part of
# the TS app bundle).
from thailand_provinces import THAILAND_PROVINCE_COORDS  # noqa: E402


def supabase_headers(prefer: str | None = None) -> dict:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def fetch_all_idem_units(province: str | None = None) -> list[dict]:
    all_rows: list[dict] = []
    from_idx = 0
    page_size = 1000
    cols = "unit_code,unit_name,bls,als,cls,emt_p,aemt,emt_i,emt,emt_b,emr,province"
    province_filter = f"&province=eq.{requests.utils.quote(province)}" if province else ""
    while True:
        url = f"{SUPABASE_URL}/rest/v1/idem_units?select={cols}&order=unit_code.asc{province_filter}"
        resp = requests.get(
            url,
            headers={**supabase_headers(), "Range-Unit": "items", "Range": f"{from_idx}-{from_idx + page_size - 1}"},
            timeout=30,
        )
        resp.raise_for_status()
        page = resp.json()
        all_rows.extend(page)
        if len(page) < page_size:
            break
        from_idx += page_size
    return all_rows


def build_team_and_vehicles(unit: dict) -> tuple[dict, list[dict]] | None:
    bls = int(unit.get("bls") or 0)
    als = int(unit.get("als") or 0)
    cls = int(unit.get("cls") or 0)
    if bls <= 0 and als <= 0 and cls <= 0:
        return None

    unit_code = unit["unit_code"]
    team_id = f"ndems-{unit_code}"
    province = unit.get("province")
    coords = THAILAND_PROVINCE_COORDS.get(province) if province else None
    base_lat = coords["lat"] if coords else 13.7563  # falls back to Bangkok only if a province is truly unrecognized
    base_lng = coords["lng"] if coords else 100.5018
    base_address = f"จังหวัด{province} (ตำแหน่งโดยประมาณระดับจังหวัด)" if province else "ไม่ทราบจังหวัด (ตำแหน่งโดยประมาณ)"

    total_staff = sum(int(unit.get(f) or 0) for f in ("emt_p", "aemt", "emt_i", "emt", "emt_b", "emr"))
    total_vehicles = bls + als + cls

    team = {
        "id": team_id,
        "name": unit.get("unit_name") or unit_code,
        "unit_code": unit_code,
        "members": max(1, total_staff),
        "vehicle": f"รวม {total_vehicles} คัน (ดูรายละเอียดในรายการยานพาหนะ)",
        "phone": "",
        "base_lat": base_lat,
        "base_lng": base_lng,
        "base_address": base_address,
    }

    vehicles = []
    for level, count in (("CLS", cls), ("ALS", als), ("BLS", bls)):
        for i in range(1, count + 1):
            vehicles.append(
                {
                    "id": f"{team_id}-{level.lower()}-{i}",
                    "rescue_team_id": team_id,
                    "unit_code": f"{unit_code}-{level}-{i}",
                    "vehicle": f"รถพยาบาลระดับ {level} (นำเข้าจาก NDEMS)",
                    "members": DEFAULT_CREW_SIZE,
                    "level": level,
                    "equipment": [],
                }
            )
    return team, vehicles


def upsert_chunked(table: str, rows: list[dict], conflict_col: str) -> int:
    failed = 0
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict_col}"
    headers = {**supabase_headers("resolution=merge-duplicates,return=minimal")}
    for i in range(0, len(rows), UPSERT_CHUNK_SIZE):
        chunk = rows[i : i + UPSERT_CHUNK_SIZE]
        resp = requests.post(url, headers=headers, json=chunk, timeout=60)
        if resp.status_code >= 400:
            print(f"  ERROR upserting {table} rows {i}-{i + len(chunk)}: {resp.status_code} {resp.text[:400]}", file=sys.stderr)
            failed += len(chunk)
    return failed


def main() -> int:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see scripts/.env.example).", file=sys.stderr)
        return 1

    province = sys.argv[1] if len(sys.argv) > 1 else None
    print(f"Fetching idem_units{f' (province={province})' if province else ' (nationwide)'}...")
    units = fetch_all_idem_units(province)
    print(f"Fetched: {len(units)} units")

    teams: list[dict] = []
    vehicles: list[dict] = []
    skipped_no_vehicle = 0
    for unit in units:
        built = build_team_and_vehicles(unit)
        if built is None:
            skipped_no_vehicle += 1
            continue
        team, unit_vehicles = built
        teams.append(team)
        vehicles.extend(unit_vehicles)

    print(f"Skipped (no BLS/ALS/CLS vehicles reported): {skipped_no_vehicle}")
    print(f"Teams to upsert: {len(teams)}")
    print(f"Vehicles to upsert: {len(vehicles)}")

    print("Upserting rescue_teams...")
    teams_failed = upsert_chunked("rescue_teams", teams, "id")
    print(f"  Failed: {teams_failed}")

    print("Upserting rescue_vehicles...")
    vehicles_failed = upsert_chunked("rescue_vehicles", vehicles, "id")
    print(f"  Failed: {vehicles_failed}")

    print(f"Done at {datetime.now(timezone.utc).isoformat()}")
    print(f"Teams upserted: {len(teams) - teams_failed} / {len(teams)}")
    print(f"Vehicles upserted: {len(vehicles) - vehicles_failed} / {len(vehicles)}")

    return 1 if (teams_failed or vehicles_failed) else 0


if __name__ == "__main__":
    sys.exit(main())
