import { CaseListPage } from '@/components/CaseListPage'

export default function CaseHistory() {
  return (
    <CaseListPage
      title="ประวัติเคส"
      emptyTitle="ยังไม่มีประวัติเคส"
      emptyDescription="เคสที่เสร็จสิ้นแล้วจะแสดงที่นี่"
      filter={(c) => c.status === 'completed'}
      sortBy="createdAt"
    />
  )
}
