import { CaseListPage } from '@/components/CaseListPage'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ประวัติเหตุ: 'Case history',
  ยังไม่มีประวัติเหตุ: 'No case history yet',
  เหตุที่ดำเนินการเสร็จสิ้นแล้วจะแสดงที่นี่: 'Completed cases will appear here',
})

export default function CaseHistory() {
  const t = useT()
  return (
    <CaseListPage
      title={t('ประวัติเหตุ')}
      emptyTitle={t('ยังไม่มีประวัติเหตุ')}
      emptyDescription={t('เหตุที่ดำเนินการเสร็จสิ้นแล้วจะแสดงที่นี่')}
      filter={(c) => c.status === 'completed'}
      sortBy="createdAt"
    />
  )
}
