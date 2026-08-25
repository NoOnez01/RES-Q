-- Adds columns for the dispatch (1669) / rescue / hospital stages, which the
-- original `cases` table didn't capture — only the initial public report.
-- Run in the SQL Editor after supabase-case-tables.sql.

alter table cases
  -- ศูนย์ 1669: severity assessment
  add column if not exists severity int,
  add column if not exists injury_description text,
  add column if not exists assessed_at timestamptz,
  -- หน่วยกู้ภัย: assigned team + progress
  add column if not exists rescue_team_name text,
  add column if not exists rescue_team_unit_code text,
  add column if not exists rescue_team_phone text,
  add column if not exists rescue_en_route_pct int,
  -- หน่วยกู้ภัย: patient info recorded at the scene
  add column if not exists patient_name text,
  add column if not exists patient_age text,
  add column if not exists patient_gender text,
  add column if not exists patient_vitals jsonb,
  add column if not exists first_aid text,
  add column if not exists patient_notes text,
  -- โรงพยาบาล: selected hospital
  add column if not exists selected_hospital_name text,
  add column if not exists selected_hospital_phone text,
  -- full status history, every stage appends to this
  add column if not exists timeline jsonb;
