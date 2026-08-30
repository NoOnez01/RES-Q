#!/usr/bin/env python3
"""Sync operational units ("หน่วยปฏิบัติการ") from the NDEMS Redash public
dashboard into Supabase's `idem_units` table.

Source dashboard:
  https://reports-idems.fm-sp.com/public/dashboards/BMlIleebVSB3EfCcmW5VurQiT1jvP6QIKMXd8yMU?org_slug=default

The dashboard's "รายละเอียด" table (query 204) is parameterized by cc_id
(ศูนย์รับแจ้งเหตุ / emergency call center) and only returns units for the one
center selected -- there is no "all centers" option in the source query, so
this script enumerates every cc_id from the dashboard's own dropdown query
(205's parameter 220) and fetches query 204 once per center to cover all
units nationwide.

Usage:
    python scripts/sync_idem_units.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, read from
scripts/.env (see scripts/.env.example) or the environment. See README.md
for full setup instructions.
"""

from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

import requests

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass  # python-dotenv is optional -- real env vars still work without it.

# --- Redash source config -----------------------------------------------
# Not secrets (this is a public dashboard token, already visible in the
# dashboard's own URL) but still overridable via env in case the source
# dashboard ever moves.
REDASH_BASE_URL = os.environ.get("REDASH_BASE_URL", "https://reports-idems.fm-sp.com")
REDASH_PUBLIC_TOKEN = os.environ.get(
    "REDASH_PUBLIC_TOKEN", "BMlIleebVSB3EfCcmW5VurQiT1jvP6QIKMXd8yMU"
)
REDASH_UNITS_QUERY_ID = int(os.environ.get("REDASH_UNITS_QUERY_ID", "204"))
REDASH_CC_DROPDOWN_QUERY_ID = int(os.environ.get("REDASH_CC_DROPDOWN_QUERY_ID", "205"))
REDASH_CC_DROPDOWN_PARAM_ID = int(os.environ.get("REDASH_CC_DROPDOWN_PARAM_ID", "220"))
REDASH_CC_PARAM_NAME = os.environ.get("REDASH_CC_PARAM_NAME", "cc_id")

# --- Supabase config -------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
TABLE_NAME = "idem_units"
UPSERT_CHUNK_SIZE = 500

# --- Source column names (Thai, exactly as Redash returns them) -----------
COL_PROVINCE = "จังหวัด"
COL_UNIT_CODE = "รหัสหน่วยปฏิบัติการ"
COL_UNIT_NAME = "ชื่อหน่วยปฏิบัติการ"
COL_BLS = "รถ (BLS)"
COL_ALS = "รถ (ALS)"
COL_CLS = "รถ (CLS)"
COL_EMT_P = "EMT-P"
COL_AEMT = "AEMT"
COL_EMT_I = "EMT-I"
COL_EMT = "EMT"
COL_EMT_B = "EMT-B"
COL_EMR = "EMR"

NUMERIC_FIELDS = {
    "bls": COL_BLS,
    "als": COL_ALS,
    "cls": COL_CLS,
    "emt_p": COL_EMT_P,
    "aemt": COL_AEMT,
    "emt_i": COL_EMT_I,
    "emt": COL_EMT,
    "emt_b": COL_EMT_B,
    "emr": COL_EMR,
}


def redash_headers(json_body: bool = False) -> dict:
    headers = {"Authorization": f"Key {REDASH_PUBLIC_TOKEN}", "Accept": "application/json"}
    if json_body:
        headers["Content-Type"] = "application/json;charset=UTF-8"
    return headers


def fetch_call_centers() -> list[dict]:
    url = f"{REDASH_BASE_URL}/api/queries/{REDASH_CC_DROPDOWN_QUERY_ID}/dropdowns/{REDASH_CC_DROPDOWN_PARAM_ID}"
    resp = requests.get(url, headers=redash_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def poll_job(job_id: str, max_wait_sec: int = 45) -> dict:
    """Redash returns {"job": {...}} instead of a cached result when a
    parameter combination hasn't been queried before -- poll until it's
    computed rather than assuming every cc_id is already cached."""
    url = f"{REDASH_BASE_URL}/api/jobs/{job_id}"
    waited = 0.0
    while waited < max_wait_sec:
        resp = requests.get(url, headers=redash_headers(), timeout=30)
        resp.raise_for_status()
        job = resp.json()["job"]
        if job["status"] == 3:  # finished
            result_url = f"{REDASH_BASE_URL}/api/query_results/{job['query_result_id']}.json"
            r2 = requests.get(result_url, headers=redash_headers(), timeout=30)
            r2.raise_for_status()
            return r2.json()["query_result"]
        if job["status"] == 4:  # failed
            raise RuntimeError(f"Redash job failed: {job.get('error')}")
        time.sleep(1)
        waited += 1
    raise RuntimeError(f"Timed out waiting for Redash job {job_id}")


def fetch_units_for_cc(cc_id: str, retries: int = 3) -> tuple[str, list[dict]]:
    """Returns (retrieved_at, rows) for one call center's units."""
    url = f"{REDASH_BASE_URL}/api/queries/{REDASH_UNITS_QUERY_ID}/results"
    payload = {"id": REDASH_UNITS_QUERY_ID, "parameters": {REDASH_CC_PARAM_NAME: cc_id}}
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.post(url, headers=redash_headers(json_body=True), json=payload, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            qr = data.get("query_result")
            if qr is None and "job" in data:
                qr = poll_job(data["job"]["id"])
            if qr is None:
                raise RuntimeError(f"Unexpected Redash response shape: keys={list(data.keys())}")
            return qr.get("retrieved_at"), qr["data"]["rows"]
        except Exception as e:  # noqa: BLE001 -- deliberately broad, retried below
            last_err = e
            if attempt < retries:
                time.sleep(1.5 * attempt)
    raise RuntimeError(f"failed after {retries} attempts: {last_err}")


def safe_numeric(value: Any, field_label: str, unit_code: str, warnings: list[str]) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        warnings.append(f'{unit_code}: unexpected boolean for "{field_label}"={value!r}, set to NULL')
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().replace(",", "")
        if cleaned == "":
            return None
        try:
            return float(cleaned)
        except ValueError:
            warnings.append(f'{unit_code}: cannot parse "{field_label}"={value!r} as numeric, set to NULL')
            return None
    warnings.append(f'{unit_code}: unexpected type for "{field_label}"={value!r} ({type(value).__name__}), set to NULL')
    return None


def normalize_row(row: dict, retrieved_at: str | None, cc_id: str, warnings: list[str]) -> dict | None:
    unit_code = str(row.get(COL_UNIT_CODE) or "").strip()
    if not unit_code:
        warnings.append(f"Skipped row with missing {COL_UNIT_CODE}: {row!r}")
        return None

    unit_name = str(row.get(COL_UNIT_NAME) or "").strip()
    if not unit_name:
        warnings.append(f"{unit_code}: missing {COL_UNIT_NAME}")

    province = str(row.get(COL_PROVINCE) or "").strip()

    out = {
        "unit_code": unit_code,
        "unit_name": unit_name or None,
        "province": province or None,
        "cc_id": cc_id,
        "source_updated_at": retrieved_at,
    }
    for field, source_col in NUMERIC_FIELDS.items():
        out[field] = safe_numeric(row.get(source_col), source_col, unit_code, warnings)
    return out


def supabase_headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def get_existing_unit_codes() -> set[str]:
    """PostgREST caps a response at 1000 rows by default -- a plain GET
    against a table this size silently returns only the first page, which
    would undercount "already existing" codes and misreport every row past
    the cap as a fresh insert. Page through with Range until a short page
    signals the end."""
    codes: set[str] = set()
    page_size = 1000
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=unit_code"
        resp = requests.get(
            url,
            headers={**supabase_headers(), "Range-Unit": "items", "Range": f"{offset}-{offset + page_size - 1}"},
            timeout=30,
        )
        resp.raise_for_status()
        page = resp.json()
        codes.update(row["unit_code"] for row in page)
        if len(page) < page_size:
            break
        offset += page_size
    return codes


def upsert_to_supabase(rows: list[dict]) -> tuple[int, int, int]:
    if not rows:
        return 0, 0, 0

    existing_codes = get_existing_unit_codes()
    batch_codes = {r["unit_code"] for r in rows}
    inserted = len(batch_codes - existing_codes)
    updated = len(batch_codes & existing_codes)
    failed = 0

    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?on_conflict=unit_code"
    headers = {**supabase_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"}

    for i in range(0, len(rows), UPSERT_CHUNK_SIZE):
        chunk = rows[i : i + UPSERT_CHUNK_SIZE]
        resp = requests.post(url, headers=headers, json=chunk, timeout=60)
        if resp.status_code >= 400:
            print(
                f"  ERROR upserting rows {i}-{i + len(chunk)}: {resp.status_code} {resp.text[:500]}",
                file=sys.stderr,
            )
            failed += len(chunk)
            batch_failed_codes = {r["unit_code"] for r in chunk}
            inserted -= len(batch_failed_codes - existing_codes)
            updated -= len(batch_failed_codes & existing_codes)

    return inserted, updated, failed


def main() -> int:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print(
            "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
            "(copy scripts/.env.example to scripts/.env and fill them in).",
            file=sys.stderr,
        )
        return 1

    print("Fetching Redash...")
    try:
        call_centers = fetch_call_centers()
    except Exception as e:
        print(f"ERROR: failed to fetch call center list from Redash: {e}", file=sys.stderr)
        return 1

    print(
        f"Found queries: units=Q{REDASH_UNITS_QUERY_ID}, "
        f"call-center dropdown=Q{REDASH_CC_DROPDOWN_QUERY_ID}/param {REDASH_CC_DROPDOWN_PARAM_ID}"
    )
    print(f"Found {len(call_centers)} call centers (ศูนย์รับแจ้งเหตุ) to iterate")

    raw_rows: list[tuple[str | None, str, dict]] = []
    fetch_errors: list[tuple[str, str]] = []
    for i, cc in enumerate(call_centers, 1):
        cc_id = cc["value"]
        try:
            retrieved_at, rows = fetch_units_for_cc(cc_id)
        except Exception as e:
            fetch_errors.append((cc_id, str(e)))
            print(f"  [{i}/{len(call_centers)}] cc_id={cc_id} ({cc.get('name')}): ERROR {e}")
            continue
        print(f"  [{i}/{len(call_centers)}] cc_id={cc_id} ({cc.get('name')}): {len(rows)} rows")
        for row in rows:
            raw_rows.append((retrieved_at, cc_id, row))
        time.sleep(0.2)  # be polite to the source server

    print(f"Fetched: {len(raw_rows)} rows")
    if fetch_errors:
        print(f"WARNING: {len(fetch_errors)} call center(s) failed to fetch and were skipped:")
        for cc_id, err in fetch_errors:
            print(f"  - cc_id={cc_id}: {err}")

    warnings: list[str] = []
    by_code: dict[str, dict] = {}
    duplicate_codes: list[str] = []
    for retrieved_at, cc_id, row in raw_rows:
        normalized = normalize_row(row, retrieved_at, cc_id, warnings)
        if normalized is None:
            continue
        code = normalized["unit_code"]
        if code in by_code:
            duplicate_codes.append(code)
        by_code[code] = normalized

    validated = list(by_code.values())
    print(f"Validated: {len(validated)} rows")
    print(f"Duplicates: {len(duplicate_codes)}")
    if duplicate_codes:
        unique_dupes = sorted(set(duplicate_codes))
        shown = unique_dupes[:20]
        suffix = f" ...and {len(unique_dupes) - 20} more" if len(unique_dupes) > 20 else ""
        print(f"  duplicate unit_code(s) (last-seen values kept): {shown}{suffix}")

    if warnings:
        print(f"{len(warnings)} data warning(s):")
        for w in warnings[:20]:
            print(f"  - {w}")
        if len(warnings) > 20:
            print(f"  ... and {len(warnings) - 20} more")

    now_iso = datetime.now(timezone.utc).isoformat()
    for row in validated:
        row["updated_at"] = now_iso

    print("Upserting to Supabase...")
    try:
        inserted, updated, failed = upsert_to_supabase(validated)
    except Exception as e:
        print(f"ERROR: Supabase upsert failed: {e}", file=sys.stderr)
        return 1

    print(f"Inserted: {inserted}")
    print(f"Updated: {updated}")
    print(f"Failed: {failed}")

    return 1 if (fetch_errors or failed) else 0


if __name__ == "__main__":
    sys.exit(main())
