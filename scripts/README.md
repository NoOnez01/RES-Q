# NDEMS unit sync (Redash → Supabase)

Pulls the "หน่วยปฏิบัติการ" (operational unit) directory from the NDEMS
Redash public dashboard and upserts it into Supabase's `idem_units` table,
for use on ResQ's rescue-unit search page (filter by vehicle capability
level — BLS/ALS/CLS — and distance from the incident).

**Source dashboard:**
https://reports-idems.fm-sp.com/public/dashboards/BMlIleebVSB3EfCcmW5VurQiT1jvP6QIKMXd8yMU?org_slug=default

## How the source works

The dashboard's public token doubles as an API key (`Authorization: Key
<token>` header) for two specific Redash queries:

- **Query 205** — a dropdown data source (parameter 220) listing all 80
  ศูนย์รับแจ้งเหตุ (emergency call centers) as `{name, value}` pairs, e.g.
  `{"name": "กระบี่", "value": "81-1"}`.
- **Query 204** — the unit-level detail table ("รายละเอียด" widget), scoped
  to one call center at a time via a `cc_id` parameter. There is no
  "all centers" option in the source query itself, so this script calls it
  once per call center and concatenates the results to cover the whole
  country (~8,600 units across 80 centers as of the last sync).

This was found by loading the public dashboard in a real browser and
inspecting the network requests it made (see `.tmp-inspect-redash.cjs`
pattern used during development) — the direct
`/api/queries/{id}/results.json` endpoint returns 404 without this header;
the dashboard's own frontend calls `POST /api/queries/{id}/results` with
the token in the `Authorization` header instead.

## Setup

1. **Python 3.10+** and pip.
2. Install dependencies:
   ```
   pip install -r scripts/requirements.txt
   ```
3. Copy the env template and fill in your Supabase project's values:
   ```
   cp scripts/.env.example scripts/.env
   ```
   - `SUPABASE_URL` — your project's URL (Project Settings → API in the
     Supabase dashboard, or the same value as `VITE_SUPABASE_URL` in this
     repo's `.env.local`).
   - `SUPABASE_SERVICE_ROLE_KEY` — the **service_role** key, *not* the anon
     key (Project Settings → API → service_role). This bypasses row-level
     security, so:
     - Never commit `scripts/.env` (already gitignored).
     - Never use this key in frontend/browser code.
     - Only run this script from a trusted machine or CI secret store.

## Creating the table

The schema lives in `supabase/migrations/20260830171821_create_idem_units.sql`
and `supabase/migrations/20260830180045_add_idem_units_location.sql` (adds
`province`/`cc_id`, needed for the distance estimate on the unit-search
page). Apply them with the Supabase CLI (requires `supabase login` and
`supabase link` once per machine — already done for this project):

```
npx supabase db push
```

This creates `public.idem_units`:

| column             | type        | notes                                   |
|--------------------|-------------|------------------------------------------|
| id                 | uuid        | primary key, `gen_random_uuid()`          |
| unit_code          | text        | not null, **unique** — upsert conflict key |
| unit_name          | text        |                                            |
| bls                | numeric     |                                            |
| als                | numeric     |                                            |
| cls                | numeric     |                                            |
| emt_p              | numeric     |                                            |
| aemt               | numeric     |                                            |
| emt_i              | numeric     |                                            |
| emt                | numeric     |                                            |
| emt_b              | numeric     |                                            |
| emr                | numeric     |                                            |
| province           | text        | Thai province name, exactly as the source reports it |
| cc_id              | text        | source call-center id the unit belongs to (e.g. `81-1`) |
| source_updated_at  | timestamptz | Redash's `retrieved_at` for that row's batch |
| created_at         | timestamptz | set once, on first insert                 |
| updated_at         | timestamptz | bumped on every sync that touches the row  |

RLS is enabled: `anon`/`authenticated` can `select` (it's a public unit
directory, meant to be read by the app), only `service_role` can
insert/update (this script). Nothing can delete a row through the API —
the source doesn't flag units as removed, so old data is left alone unless
you manually confirm a unit no longer exists and remove it by hand.

## Running the sync

```
python scripts/sync_idem_units.py
```

Expected output shape:

```
Fetching Redash...
Found queries: units=Q204, call-center dropdown=Q205/param 220
Found 80 call centers (ศูนย์รับแจ้งเหตุ) to iterate
  [1/80] cc_id=81-1 (กระบี่): 53 rows
  ...
Fetched: 8630 rows
Validated: 8630 rows
Duplicates: 0
Upserting to Supabase...
Inserted: 8630
Updated: 0
Failed: 0
```

- **Duplicates** counts `unit_code` values seen more than once across
  different call centers in the same run (shouldn't normally happen — units
  belong to exactly one center — but is checked and logged rather than
  assumed).
- Rows missing `unit_code` are skipped (logged, not upserted) since there's
  nothing to key them on. Rows with a missing `unit_name` or a numeric
  field that isn't actually numeric are kept, with the bad field set to
  `NULL` and a warning logged — never guessed or defaulted to 0.
- Exit code is non-zero if any call center failed to fetch, or any Supabase
  upsert batch failed, so this is safe to wire into a cron/CI job and
  treat a non-zero exit as "needs attention."
- Re-running is safe any time — `unit_code` is the upsert key, so existing
  units are updated in place and new ones are inserted; nothing is deleted.

## Verifying the data

Quick spot-check via the Supabase SQL editor or `psql`:

```sql
select count(*) from idem_units;
select * from idem_units order by updated_at desc limit 10;
select unit_code, count(*) from idem_units group by unit_code having count(*) > 1; -- should be empty
```

Or via PostgREST with the anon key (read-only, safe to run from anywhere):

```
curl "$SUPABASE_URL/rest/v1/idem_units?select=*&limit=5" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
```

## Using this table on a dashboard (Supadash or otherwise)

This repository doesn't have an existing Supadash/BI dashboard config to
wire up (checked — no `supadash`, dashboard, or data-source config found
anywhere in the repo). To point one at this data:

1. Add `idem_units` as a Postgres/Supabase data source using this
   project's connection string or the PostgREST endpoint above.
2. Because RLS grants `select` to `anon`, a dashboard tool that only has
   the anon key can already read this table directly — no service-role key
   needed for read-only dashboards.
3. Useful groupings for a unit-capability view: `bls`, `als`, `cls` give
   vehicle counts per level per unit; `emt_p`/`aemt`/`emt_i`/`emt`/`emt_b`/
   `emr` give staff-certification counts per unit.

**In-app search page:** `/dispatch/unit-search` (`src/pages/dispatch/UnitSearch.tsx`)
already does this — search by name/code/province, filter by BLS/ALS/CLS,
and sort by distance estimated from a selected case's location using
`src/lib/idemUnits.ts` + `src/lib/thailandProvinces.ts`'s province-centroid
table (the source gives no per-unit coordinates, so this is a province-level
approximation, always labeled as such in the UI — never presented as the
unit's exact position). This is a read-only reference lookup, separate from
the app's own rescue-team assignment flow (`src/lib/rescueAssignment.ts`),
which still only assigns from `rescueTeams` registered directly in ResQ.
