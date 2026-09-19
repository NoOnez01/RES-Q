import { CaseListPage } from '@/components/CaseListPage'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ประวัติเคส: 'Case history',
  ยังไม่มีประวัติเคส: 'No case history yet',
  เคสที่เสร็จสิ้นแล้วจะแสดงที่นี่: 'Completed cases will appear here',
})

export default function CaseHistory() {
  const t = useT()
  return (
    <CaseListPage
      title={t('ประวัติเคส')}
      emptyTitle={t('ยังไม่มีประวัติเคส')}
      emptyDescription={t('เคสที่เสร็จสิ้นแล้วจะแสดงที่นี่')}
      filter={(c) => c.status === 'completed'}
      sortBy="createdAt"
    />
  )
}
