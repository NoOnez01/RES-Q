import { CaseListPage } from '@/components/CaseListPage'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  เคสปัจจุบัน: 'Current cases',
  ไม่มีเคสที่กำลังดำเนินการ: 'No cases in progress',
  เคสที่ยังไม่เสร็จสิ้นจะแสดงที่นี่: 'Cases not yet completed will appear here',
})

export default function CurrentCases() {
  const t = useT()
  return (
    <CaseListPage
      title={t('เคสปัจจุบัน')}
      emptyTitle={t('ไม่มีเคสที่กำลังดำเนินการ')}
      emptyDescription={t('เคสที่ยังไม่เสร็จสิ้นจะแสดงที่นี่')}
      filter={(c) => c.status !== 'completed'}
      sortBy="updatedAt"
    />
  )
}
