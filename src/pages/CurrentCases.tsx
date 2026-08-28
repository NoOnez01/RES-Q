import { CaseListPage } from '@/components/CaseListPage'

export default function CurrentCases() {
  return (
    <CaseListPage
      title="เคสปัจจุบัน"
      emptyTitle="ไม่มีเคสที่กำลังดำเนินการ"
      emptyDescription="เคสที่ยังไม่เสร็จสิ้นจะแสดงที่นี่"
      filter={(c) => c.status !== 'completed'}
      sortBy="updatedAt"
    />
  )
}
