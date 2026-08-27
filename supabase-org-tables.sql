-- Run this in the Supabase SQL Editor. Creates the canonical rescue-team and
-- hospital tables (replacing the hardcoded MOCK_RESCUE_TEAMS/MOCK_HOSPITALS
-- arrays in src/lib/mockData.ts as the source of truth) and seeds them with
-- the same data already used throughout the app, so existing case records
-- referencing these names/ids keep lining up.
--
-- Part of the real-auth + per-org data isolation change -- run this before
-- supabase-profiles-table.sql and supabase-case-fk-columns.sql.

create table if not exists rescue_teams (
  id text primary key,
  name text not null,
  unit_code text not null,
  members int not null,
  vehicle text not null,
  phone text not null,
  base_lat double precision not null,
  base_lng double precision not null,
  base_address text not null,
  equipment text[] not null default '{}',
  driver_name text,
  plate_number text,
  created_at timestamptz not null default now()
);

create table if not exists hospitals (
  id text primary key,
  name text not null,
  distance_km double precision not null,
  eta_min int not null,
  er_available boolean not null default true,
  beds_available int not null default 0,
  specialties text[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  address text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table rescue_teams enable row level security;
alter table hospitals enable row level security;

-- Org rosters aren't sensitive on their own (no patient data) -- keep them
-- publicly readable so the dispatch/rescue/hospital pickers and case
-- assignment logic can look them up without needing a session yet.
create policy "Public read rescue_teams" on rescue_teams for select to public using (true);
create policy "Public read hospitals" on hospitals for select to public using (true);

grant select on rescue_teams to anon, authenticated;
grant select on hospitals to anon, authenticated;

insert into rescue_teams (id, name, unit_code, members, vehicle, phone, base_lat, base_lng, base_address, equipment, driver_name, plate_number) values
  ('rt-01', 'หน่วยกู้ชีพสยามรวมใจ เชียงใหม่', 'EMS-CM1', 3, 'รถพยาบาลฉุกเฉิน ทะเบียน ชม-1145', '053-100-1145', 18.7904, 98.9847, 'จุดจอดประตูช้างเผือก อำเภอเมืองเชียงใหม่', array['เครื่องตัดถ่าง','เฝือกดามคอ','ชุดปฐมพยาบาล'], 'สมชาย แก้วมณี', 'ชม-1145'),
  ('rt-02', 'มูลนิธิเชียงใหม่สามัคคีการกุศล', 'EMS-CM2', 4, 'รถพยาบาลฉุกเฉิน ทะเบียน ชม-2278', '053-100-2278', 18.7753, 98.9955, 'ศูนย์วิทยุเชียงใหม่สามัคคี ตำบลวัดเกต อำเภอเมืองเชียงใหม่', array['ถังออกซิเจน','เปลสนาม','ชุดปฐมพยาบาล'], 'วิชัย ศรีสุข', 'ชม-2278'),
  ('rt-03', 'หน่วยกู้ชีพนเรศวร เชียงใหม่', 'EMS-CM3', 3, 'รถพยาบาลฉุกเฉิน ทะเบียน ชม-3091', '053-100-3091', 18.8021, 98.9694, 'ศูนย์กู้ชีพนเรศวร ตำบลช้างเผือก อำเภอเมืองเชียงใหม่', array['เครื่องตัดถ่าง','ถังออกซิเจน','เฝือกดามคอ'], 'ประยุทธ บุญมา', 'ชม-3091')
on conflict (id) do nothing;

insert into hospitals (id, name, distance_km, eta_min, er_available, beds_available, specialties, lat, lng, address, phone) values
  ('hp-01', 'โรงพยาบาลมหาราชนครเชียงใหม่ (สวนดอก)', 3.4, 9, true, 7, array['อุบัติเหตุ','ศัลยกรรม','หัวใจ'], 18.7967, 98.9713, 'ถนนสุเทพ ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่', '053-935-000'),
  ('hp-02', 'โรงพยาบาลนครพิงค์', 9.8, 18, true, 4, array['อุบัติเหตุ','สมองและระบบประสาท'], 18.8687, 99.0034, 'ถนนโชตนา ตำบลดอนแก้ว อำเภอแม่ริม จังหวัดเชียงใหม่', '053-999-200'),
  ('hp-03', 'โรงพยาบาลเชียงใหม่ราม', 2.1, 7, true, 10, array['อุบัติเหตุ','หัวใจ','เด็ก'], 18.7847, 98.9877, 'ถนนบุญเรืองฤทธิ์ ตำบลศรีภูมิ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่', '053-920-300'),
  ('hp-04', 'โรงพยาบาลกรุงเทพเชียงใหม่', 5.6, 13, false, 0, array['อุบัติเหตุ','ศัลยกรรมกระดูก'], 18.7599, 99.0021, 'ถนนซุปเปอร์ไฮเวย์ เชียงใหม่-ลำปาง ตำบลท่าศาลา อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่', '053-089-888')
on conflict (id) do nothing;
