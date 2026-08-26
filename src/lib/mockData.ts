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
    unitCode: 'EMS-CM1',
    members: 3,
    vehicle: 'รถพยาบาลฉุกเฉิน ทะเบียน ชม-1145',
    phone: '053-100-1145',
    base: { lat: 18.7904, lng: 98.9847, address: 'จุดจอดประตูช้างเผือก อำเภอเมืองเชียงใหม่' },
    equipment: ['เครื่องตัดถ่าง', 'เฝือกดามคอ', 'ชุดปฐมพยาบาล'],
    driverName: 'สมชาย แก้วมณี',
    plateNumber: 'ชม-1145',
  },
  {
    id: 'rt-02',
    name: 'มูลนิธิเชียงใหม่สามัคคีการกุศล',
    unitCode: 'EMS-CM2',
    members: 4,
    vehicle: 'รถพยาบาลฉุกเฉิน ทะเบียน ชม-2278',
    phone: '053-100-2278',
    base: { lat: 18.7753, lng: 98.9955, address: 'ศูนย์วิทยุเชียงใหม่สามัคคี ตำบลวัดเกต อำเภอเมืองเชียงใหม่' },
    equipment: ['ถังออกซิเจน', 'เปลสนาม', 'ชุดปฐมพยาบาล'],
    driverName: 'วิชัย ศรีสุข',
    plateNumber: 'ชม-2278',
  },
  {
    id: 'rt-03',
    name: 'หน่วยกู้ชีพนเรศวร เชียงใหม่',
    unitCode: 'EMS-CM3',
    members: 3,
    vehicle: 'รถพยาบาลฉุกเฉิน ทะเบียน ชม-3091',
    phone: '053-100-3091',
    base: { lat: 18.8021, lng: 98.9694, address: 'ศูนย์กู้ชีพนเรศวร ตำบลช้างเผือก อำเภอเมืองเชียงใหม่' },
    equipment: ['เครื่องตัดถ่าง', 'ถังออกซิเจน', 'เฝือกดามคอ'],
    driverName: 'ประยุทธ บุญมา',
    plateNumber: 'ชม-3091',
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

export const INCIDENT_TYPES = [
  'อุบัติเหตุทางถนน',
  'หมดสติ / ไม่รู้สึกตัว',
  'เจ็บหน้าอก / สงสัยหัวใจ',
  'หายใจลำบาก',
  'พลัดตกจากที่สูง',
  'ไฟไหม้ / ถูกความร้อน',
  'เลือดออกรุนแรง',
  'ชักเกร็ง',
  'อื่น ๆ',
]
