import { registerTranslations } from './i18n'

/**
 * RES-Q's privacy notice under Thailand's Personal Data Protection Act
 * B.E. 2562 (PDPA): what the app collects, why, who sees it and what a
 * person can ask for. Kept here as content, apart from the pages that show
 * it (pages/Privacy.tsx, components/PrivacyLink.tsx), so the wording can be
 * reviewed and updated without touching any feature.
 *
 * It describes what the app does -- change the app, change this. Bump
 * PRIVACY_UPDATED when the meaning changes.
 */

export const PRIVACY_UPDATED = '2 ตุลาคม 2569'

// Thai is the source text and the i18n key; `th(thai, english)` registers
// the English alongside it.
const en: Record<string, string> = {}
const th = (thai: string, english: string): string => {
  en[thai] = english
  return thai
}

export interface PrivacySection {
  id: string
  title: string
  paragraphs?: string[]
  items?: string[]
}

export const PRIVACY_TITLE = th('ประกาศความเป็นส่วนตัว (PDPA)', 'Privacy notice (PDPA)')
export const PRIVACY_UPDATED_LABEL = th('ปรับปรุงล่าสุด {date}', 'Last updated {date}')
export const PRIVACY_INTRO = th(
  'RES-Q ให้ความสำคัญกับข้อมูลส่วนบุคคลของผู้แจ้งเหตุ ผู้ป่วย และเจ้าหน้าที่ ประกาศนี้อธิบายว่าแอปเก็บข้อมูลอะไร ใช้เพื่ออะไร เปิดเผยแก่ใคร และท่านมีสิทธิอะไรบ้าง ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562',
  "RES-Q takes the personal data of reporters, patients and responders seriously. This notice explains what the app collects, what it is used for, who it is disclosed to and what rights you have under Thailand's Personal Data Protection Act B.E. 2562 (2019).",
)
export const PRIVACY_PROTOTYPE = th(
  'RES-Q เป็นต้นแบบเพื่อการสาธิตและการวิจัย ข้อมูลในระบบส่วนใหญ่เป็นข้อมูลจำลอง หากท่านกรอกข้อมูลจริง ข้อมูลนั้นจะได้รับการดูแลตามประกาศนี้',
  'RES-Q is a prototype for demonstration and research. Most data in the system is simulated; any real data you enter is handled as this notice describes.',
)

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'controller',
    title: th('ผู้ควบคุมข้อมูลส่วนบุคคล', 'Data controller'),
    paragraphs: [
      th(
        'ทีมผู้พัฒนา RES-Q โครงการ Technology Excellence Program โรงเรียนปรินส์รอยแยลส์วิทยาลัย จังหวัดเชียงใหม่ เป็นผู้ควบคุมข้อมูลส่วนบุคคลที่เก็บผ่านแอปนี้',
        "The RES-Q development team, Technology Excellence Program, The Prince Royal's College, Chiang Mai, is the controller of the personal data collected through this app.",
      ),
    ],
  },
  {
    id: 'collected',
    title: th('ข้อมูลที่เก็บรวบรวม', 'Data we collect'),
    items: [
      th(
        'ผู้แจ้งเหตุ: ตำแหน่ง GPS และที่อยู่ของจุดเกิดเหตุ ภาพถ่ายจุดเกิดเหตุ เสียงที่ท่านบันทึก เบอร์โทรศัพท์ ชื่อ และรายละเอียดเหตุที่ท่านกรอก',
        'Reporters: GPS location and address of the scene, photos of the scene, audio you record, phone number, name and the incident details you enter.',
      ),
      th(
        'ผู้ป่วย: ชื่อ อายุ เพศ เลขบัตรประชาชน (ถ้ามี) อาการ สัญญาณชีพ ระดับความรุนแรง การปฐมพยาบาลที่ได้รับ และโรงพยาบาลปลายทาง ซึ่งเป็นข้อมูลสุขภาพ',
        'Patients: name, age, sex, national ID number (if given), symptoms, vital signs, severity level, first aid given and destination hospital. This is health data.',
      ),
      th('ญาติหรือผู้ติดต่อ: ชื่อและเบอร์โทรศัพท์ที่ผู้เกี่ยวข้องกรอกไว้ให้', 'Relatives or contacts: the name and phone number someone involved has entered.'),
      th(
        'เจ้าหน้าที่ (ศูนย์สั่งการ 1669 หน่วยกู้ชีพ โรงพยาบาล): ชื่อ อีเมล เบอร์โทรศัพท์ หน่วยงานที่สังกัด บทบาท และตำแหน่งของรถขณะปฏิบัติงาน',
        'Staff (1669 dispatch, rescue teams, hospitals): name, email, phone number, organization, role and the vehicle’s location while on a case.',
      ),
      th(
        'บัญชีผู้ใช้: อีเมล และตัวระบุบัญชี LINE หรือ Google เมื่อท่านเข้าสู่ระบบด้วยบริการดังกล่าว',
        'Accounts: email, and your LINE or Google account identifier when you sign in with those services.',
      ),
      th('การใช้งาน: ประวัติเหตุ คะแนนความพึงพอใจ และเหรียญสะสม', 'Usage: case history, satisfaction ratings and reward coins.'),
      th(
        'วิดีโอคอล: ภาพและเสียงส่งถึงคู่สนทนาแบบสดเท่านั้น แอปไม่บันทึกวิดีโอคอลเก็บไว้',
        'Video calls: picture and sound go live to the people on the call only. The app does not record video calls.',
      ),
      th(
        'การสแกนบัตรประชาชน: อ่านข้อความบนเครื่องของท่าน ภาพบัตรไม่ถูกส่งหรือเก็บไว้ในระบบ เก็บเฉพาะชื่อและเลขบัตรที่ท่านยืนยัน',
        'ID card scanning: the text is read on your own device. The card image is not sent or stored; only the name and number you confirm are kept.',
      ),
      th(
        'ข้อมูลที่เก็บในเครื่องของท่าน: การตั้งค่า เช่น ภาษา ธีม เสียง และแผนที่ที่เลือก รวมถึงแบบฟอร์มที่กรอกค้างไว้',
        'Stored on your device: settings such as language, theme, sound and chosen map, and forms you have not finished.',
      ),
    ],
  },
  {
    id: 'purposes',
    title: th('วัตถุประสงค์และฐานทางกฎหมาย', 'Purposes and legal bases'),
    items: [
      th(
        'ประสานการช่วยเหลือฉุกเฉิน ตั้งแต่รับแจ้งเหตุ ส่งหน่วยกู้ชีพ จนถึงส่งต่อโรงพยาบาล: เพื่อป้องกันหรือระงับอันตรายต่อชีวิต ร่างกาย หรือสุขภาพ (มาตรา 24 (2))',
        'Coordinating the emergency response, from the report to dispatching a rescue team to hospital handover: to prevent or suppress danger to life, body or health (Section 24(2)).',
      ),
      th(
        'ข้อมูลสุขภาพของผู้ป่วย: เพื่อป้องกันหรือระงับอันตรายต่อชีวิต ร่างกาย หรือสุขภาพ ในกรณีที่เจ้าของข้อมูลไม่สามารถให้ความยินยอมได้ (มาตรา 26 (1)) กรณีอื่นจะขอความยินยอมโดยชัดแจ้ง',
        "Patients' health data: to prevent or suppress danger to life, body or health where the person cannot give consent (Section 26(1)). In other cases explicit consent is asked for.",
      ),
      th('บัญชีเจ้าหน้าที่และการตรวจสอบสิทธิ์: เพื่อให้บริการตามที่ท่านสมัครใช้ (มาตรา 24 (3))', 'Staff accounts and access checks: to provide the service you signed up for (Section 24(3)).'),
      th(
        'สถิติ คะแนนความพึงพอใจ และการปรับปรุงระบบ: ประโยชน์โดยชอบด้วยกฎหมายของผู้ควบคุมข้อมูล (มาตรา 24 (5)) โดยใช้ข้อมูลสรุปที่ไม่ระบุตัวบุคคลเท่าที่ทำได้',
        "Statistics, satisfaction ratings and improving the system: the controller's legitimate interests (Section 24(5)), using summaries that do not identify a person wherever possible.",
      ),
      th(
        'การนำเสนอผลงานและการวิจัยของโครงงาน: ใช้เฉพาะข้อมูลจำลองหรือข้อมูลที่ทำให้ไม่สามารถระบุตัวบุคคลได้',
        "Presenting and researching the project: only simulated data, or data that can no longer identify a person, is used.",
      ),
    ],
  },
  {
    id: 'disclosure',
    title: th('การเปิดเผยข้อมูล', 'Who sees the data'),
    paragraphs: [th('ข้อมูลของเหตุหนึ่งเปิดเผยเฉพาะผู้ที่เกี่ยวข้องกับเหตุนั้น', 'A case’s data is disclosed only to those involved in that case.')],
    items: [
      th('ศูนย์สั่งการ 1669: เห็นทุกเหตุเพื่อรับแจ้งและสั่งการ', '1669 dispatch: sees every case, to take reports and dispatch.'),
      th('หน่วยกู้ชีพ: เห็นเฉพาะเหตุที่ได้รับมอบหมายให้หน่วยของตน', 'Rescue teams: see only cases assigned to their own team.'),
      th('โรงพยาบาล: เห็นเฉพาะผู้ป่วยที่ถูกนำส่งมายังโรงพยาบาลของตน', 'Hospitals: see only patients being brought to their own hospital.'),
      th('ผู้แจ้งเหตุ: เห็นเฉพาะเหตุที่ตนแจ้ง และผู้ที่ได้รับลิงก์ติดตามจากผู้แจ้ง', 'Reporters: see only the cases they reported, as does anyone they share the tracking link with.'),
      th(
        'ผู้ให้บริการที่ประมวลผลข้อมูลแทนเรา: Supabase (ฐานข้อมูลและที่เก็บไฟล์) LiveKit (วิดีโอคอล) Longdo Map OpenStreetMap และ Google Maps หากเปิดใช้ (รับเฉพาะพิกัดเพื่อแสดงแผนที่ หาที่อยู่ และคำนวณเส้นทาง) LINE และ Google (เข้าสู่ระบบและแจ้งเตือน)',
        'Providers that process data for us: Supabase (database and file storage), LiveKit (video calls), Longdo Map, OpenStreetMap and Google Maps if enabled (coordinates only, to show maps, find addresses and plan routes), LINE and Google (sign-in and notifications).',
      ),
      th('เราไม่ขายข้อมูลส่วนบุคคล และไม่ใช้เพื่อการโฆษณา', 'We do not sell personal data or use it for advertising.'),
    ],
  },
  {
    id: 'transfer',
    title: th('การส่งข้อมูลไปต่างประเทศ', 'Transfers abroad'),
    paragraphs: [
      th(
        'ผู้ให้บริการคลาวด์บางรายมีเซิร์ฟเวอร์อยู่นอกประเทศไทย ข้อมูลจึงอาจถูกส่งและเก็บในต่างประเทศ โดยส่งผ่านการเชื่อมต่อที่เข้ารหัส และจำกัดการเข้าถึงตามสิทธิ์ของผู้ใช้',
        'Some cloud providers have servers outside Thailand, so data may be sent to and stored abroad. It travels over encrypted connections, and access is limited by each user’s permissions.',
      ),
    ],
  },
  {
    id: 'retention',
    title: th('ระยะเวลาเก็บรักษา', 'How long we keep it'),
    items: [
      th(
        'ข้อมูลเหตุ: เก็บตลอดช่วงการทดสอบต้นแบบ และจะลบหรือทำให้ไม่สามารถระบุตัวบุคคลได้เมื่อสิ้นสุดโครงการ หรือเมื่อเจ้าของข้อมูลร้องขอ',
        'Case data: kept for the duration of the prototype trial, then deleted or made unable to identify a person when the project ends, or when the person asks.',
      ),
      th('บัญชีผู้ใช้: เก็บจนกว่าท่านจะขอลบบัญชี', 'Accounts: kept until you ask for your account to be deleted.'),
      th('ข้อมูลในเครื่องของท่าน: ลบได้เองโดยล้างข้อมูลเว็บไซต์หรือถอนการติดตั้งแอป', 'Data on your device: you can remove it by clearing the site’s data or uninstalling the app.'),
    ],
  },
  {
    id: 'security',
    title: th('การรักษาความปลอดภัย', 'Security'),
    items: [
      th('ฐานข้อมูลตรวจสิทธิ์ทุกครั้งที่อ่านหรือแก้ไข ผู้ใช้เข้าถึงได้เฉพาะข้อมูลตามบทบาทของตน', 'The database checks permissions on every read and write; users reach only the data their role allows.'),
      th('บัญชีเจ้าหน้าที่ต้องได้รับการอนุมัติก่อนจึงจะเห็นข้อมูลเหตุ', 'Staff accounts must be approved before they can see case data.'),
      th('การรับส่งข้อมูลทั้งหมดเข้ารหัส (HTTPS) รวมถึงวิดีโอคอล', 'All data in transit is encrypted (HTTPS), including video calls.'),
    ],
  },
  {
    id: 'rights',
    title: th('สิทธิของเจ้าของข้อมูล', 'Your rights'),
    paragraphs: [th('ท่านมีสิทธิตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล ดังนี้', 'Under the Personal Data Protection Act you have the right to:')],
    items: [
      th('ขอเข้าถึงและขอรับสำเนาข้อมูลของท่าน', 'Access your data and get a copy of it.'),
      th('ขอแก้ไขข้อมูลให้ถูกต้อง', 'Have your data corrected.'),
      th('ขอลบหรือทำลายข้อมูล หรือทำให้ไม่สามารถระบุตัวท่านได้', 'Have your data deleted, destroyed or made unable to identify you.'),
      th('ขอระงับหรือคัดค้านการใช้ข้อมูล', 'Restrict or object to the use of your data.'),
      th('ขอให้โอนข้อมูลไปยังผู้ควบคุมข้อมูลรายอื่น', 'Have your data transferred to another controller.'),
      th('ถอนความยินยอมที่เคยให้ไว้ โดยไม่กระทบสิ่งที่ทำไปแล้วก่อนถอน', 'Withdraw consent you have given, without affecting what was done before.'),
      th('ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)', 'Complain to the Office of the Personal Data Protection Committee (PDPC).'),
    ],
  },
  {
    id: 'contact',
    title: th('ช่องทางติดต่อและใช้สิทธิ', 'Contact and exercising your rights'),
    paragraphs: [
      th(
        'ติดต่อทีม RES-Q เพื่อใช้สิทธิหรือสอบถามเกี่ยวกับข้อมูลส่วนบุคคลได้ทาง LINE Official @resq หรือ Facebook "Res-q Prc" เราจะตอบกลับภายใน 30 วันนับแต่ได้รับคำขอ',
        'Contact the RES-Q team to exercise your rights or ask about personal data on LINE Official @resq or Facebook "Res-q Prc". We reply within 30 days of receiving a request.',
      ),
    ],
  },
  {
    id: 'changes',
    title: th('การปรับปรุงประกาศ', 'Changes to this notice'),
    paragraphs: [
      th(
        'เมื่อระบบเก็บหรือใช้ข้อมูลต่างไปจากเดิม เราจะปรับปรุงประกาศนี้และแสดงวันที่ปรับปรุงล่าสุดไว้ด้านบน',
        'When the system collects or uses data differently, we update this notice and show the date at the top.',
      ),
    ],
  },
]

// Short lines shown where data is collected (components/PrivacyLink.tsx).
export const PRIVACY_LINK_LABEL = th('ประกาศความเป็นส่วนตัว', 'Privacy notice')
export const PRIVACY_NOTE_REPORT = th(
  'ตำแหน่ง ภาพ และข้อมูลที่ท่านให้ จะส่งถึงศูนย์ 1669 หน่วยกู้ชีพ และโรงพยาบาลที่เกี่ยวข้องกับเหตุนี้เท่านั้น',
  'Your location, photos and the details you give go only to 1669, the rescue team and the hospital involved in this case.',
)
export const PRIVACY_NOTE_SIGNUP = th(
  'การสมัครสมาชิกถือว่าท่านรับทราบวิธีที่ RES-Q เก็บและใช้ข้อมูลส่วนบุคคล',
  'By signing up you acknowledge how RES-Q collects and uses personal data.',
)
export const PRIVACY_NOTE_GENERAL = th('RES-Q ดูแลข้อมูลส่วนบุคคลตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562', 'RES-Q handles personal data under the Personal Data Protection Act B.E. 2562.')

registerTranslations(en)
