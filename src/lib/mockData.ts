import type { Hospital, RescueTeam } from './types'

// Chiang Mai-area coordinates so the map has real, recognizable geography.
export const DEFAULT_INCIDENT_LOCATION = {
  lat: 18.7877,
  lng: 98.9931,
  address: 'ถนนท่าแพ ตำบลช้างม่อย อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่',
}

export const MOCK_RESCUE_TEAMS: RescueTeam[] = [
  {
    id: 'rt-01',
    name: 'หน่วยกู้ชีพสยามรวมใจ เชียงใหม่',
    phone: '053-100-1145',
    base: { lat: 18.7904, lng: 98.9847, address: 'จุดจอดประตูช้างเผือก อำเภอเมืองเชียงใหม่' },
    vehicles: [
      {
        id: 'rt-01-v1',
        rescueTeamId: 'rt-01',
        unitCode: 'EMS-CM1',
        members: 3,
        vehicle: 'รถพยาบาลฉุกเฉิน ทะเบียน ชม-1145',
        equipment: ['เครื่องตัดถ่าง', 'เฝือกดามคอ', 'ชุดปฐมพยาบาล'],
        level: 'ALS',
        driverName: 'สมชาย แก้วมณี',
        plateNumber: 'ชม-1145',
      },
    ],
  },
  {
    id: 'rt-02',
    name: 'มูลนิธิเชียงใหม่สามัคคีการกุศล',
    phone: '053-100-2278',
    base: { lat: 18.7753, lng: 98.9955, address: 'ศูนย์วิทยุเชียงใหม่สามัคคี ตำบลวัดเกต อำเภอเมืองเชียงใหม่' },
    vehicles: [
      {
        id: 'rt-02-v1',
        rescueTeamId: 'rt-02',
        unitCode: 'EMS-CM2',
        members: 4,
        vehicle: 'รถพยาบาลฉุกเฉิน ทะเบียน ชม-2278',
        equipment: ['ถังออกซิเจน', 'เปลสนาม', 'ชุดปฐมพยาบาล'],
        level: 'BLS',
        driverName: 'วิชัย ศรีสุข',
        plateNumber: 'ชม-2278',
      },
    ],
  },
  {
    id: 'rt-03',
    name: 'หน่วยกู้ชีพนเรศวร เชียงใหม่',
    phone: '053-100-3091',
    base: { lat: 18.8021, lng: 98.9694, address: 'ศูนย์กู้ชีพนเรศวร ตำบลช้างเผือก อำเภอเมืองเชียงใหม่' },
    vehicles: [
      {
        id: 'rt-03-v1',
        rescueTeamId: 'rt-03',
        unitCode: 'EMS-CM3',
        members: 3,
        vehicle: 'รถพยาบาลฉุกเฉิน ทะเบียน ชม-3091',
        equipment: ['เครื่องตัดถ่าง', 'ถังออกซิเจน', 'เฝือกดามคอ'],
        level: 'CLS',
        driverName: 'ประยุทธ บุญมา',
        plateNumber: 'ชม-3091',
      },
    ],
  },
]

/**
 * Which incident types need gear beyond a standard ambulance kit -- only
 * types actually listed here constrain assignment by equipment; anything
 * else (หมดสติ, เจ็บหน้าอก, etc.) can go to any available nearby unit.
 */
export const EQUIPMENT_FOR_INCIDENT: Record<string, string[]> = {
  'อุบัติเหตุทางถนน': ['เครื่องตัดถ่าง'],
  'พลัดตกจากที่สูง': ['เฝือกดามคอ'],
  'ไฟไหม้ / ถูกความร้อน': ['เครื่องตัดถ่าง'],
}

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'hp-01',
    name: 'โรงพยาบาลมหาราชนครเชียงใหม่ (สวนดอก)',
    distanceKm: 3.4,
    etaMin: 9,
    erAvailable: true,
    bedsAvailable: 7,
    specialties: ['อุบัติเหตุ', 'ศัลยกรรม', 'หัวใจ'],
    location: { lat: 18.7967, lng: 98.9713, address: 'ถนนสุเทพ ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่' },
    phone: '053-935-000',
  },
  {
    id: 'hp-02',
    name: 'โรงพยาบาลนครพิงค์',
    distanceKm: 9.8,
    etaMin: 18,
    erAvailable: true,
    bedsAvailable: 4,
    specialties: ['อุบัติเหตุ', 'สมองและระบบประสาท'],
    location: { lat: 18.8687, lng: 99.0034, address: 'ถนนโชตนา ตำบลดอนแก้ว อำเภอแม่ริม จังหวัดเชียงใหม่' },
    phone: '053-999-200',
  },
  {
    id: 'hp-03',
    name: 'โรงพยาบาลเชียงใหม่ราม',
    distanceKm: 2.1,
    etaMin: 7,
    erAvailable: true,
    bedsAvailable: 10,
    specialties: ['อุบัติเหตุ', 'หัวใจ', 'เด็ก'],
    location: { lat: 18.7847, lng: 98.9877, address: 'ถนนบุญเรืองฤทธิ์ ตำบลศรีภูมิ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่' },
    phone: '053-920-300',
  },
  {
    id: 'hp-04',
    name: 'โรงพยาบาลกรุงเทพเชียงใหม่',
    distanceKm: 5.6,
    etaMin: 13,
    erAvailable: false,
    bedsAvailable: 0,
    specialties: ['อุบัติเหตุ', 'ศัลยกรรมกระดูก'],
    location: { lat: 18.7599, lng: 99.0021, address: 'ถนนซุปเปอร์ไฮเวย์ เชียงใหม่-ลำปาง ตำบลท่าศาลา อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่' },
    phone: '053-089-888',
  },
]

// Standard chief-complaint categories (CBD 1-25) per the official reference
// document -- kept in this exact numbered order since dispatch/EMS staff
// identify complaints by their CBD number as much as by the Thai label.
export const INCIDENT_TYPES = [
  'CBD 1: ปวดท้อง บริเวณหลัง เชิงกราน และขา',
  'CBD 2: อาการภูมิแพ้ (Allergy and Anaphylaxis)',
  'CBD 3: อาการทางเดินหายใจ (หอบเหนื่อย หายใจลำบาก)',
  'CBD 4: เจ็บแน่นหน้าอก (Chest pain)',
  'CBD 5: หัวใจหยุดเต้น (Cardiac arrest)',
  'CBD 6: เลือดออก',
  'CBD 7: ไข้',
  'CBD 8: ทางเดินอาหาร (อาเจียน ท้องเสีย)',
  'CBD 9: โรคเบาหวาน',
  'CBD 10: ภัยอันตรายจากสิ่งแวดล้อมหรือสัตว์มีพิษกัดต่อย',
  'CBD 11: อาการทั่วไป / ค่าว่าง (Blank)',
  'CBD 12: ปวดศีรษะ / ปวดลำคอ',
  'CBD 13: คลุ้มคลั่ง / วิกฤตสุขภาพจิต / ทางจิตประสาท',
  'CBD 14: สารพิษ / ได้รับยาเกินขนาด (Poisoning / Overdose)',
  'CBD 15: การคลอด / ปัญหาทางนรีเวช',
  'CBD 16: อาการชัก (Seizure)',
  'CBD 17: อ่อนเพลีย ไม่มีแรง',
  'CBD 18: แขนขาอ่อนแรง พูดลำบาก ปากเบี้ยว (สัญญาณโรคหลอดเลือดสมอง)',
  'CBD 19: หมดสติ / วูบ / เป็นลม',
  'CBD 20: ปัญหาเกี่ยวกับเด็ก / ทารก',
  'CBD 21: ถูกทำร้าย / บาดเจ็บจากการถูกทำร้ายร่างกาย',
  'CBD 22: ไฟไหม้ / น้ำร้อนลวก / ไฟช็อต (Burn / Electrical injury)',
  'CBD 23: ตกน้ำ / จมน้ำ / อุบัติเหตุทางน้ำ (Drowning / Marine injury)',
  'CBD 24: พลัดตกหกล้ม (Falling)',
  'CBD 25: อุบัติเหตุจราจร / อุบัติเหตุยานยนต์ (Traffic injury)',
]
