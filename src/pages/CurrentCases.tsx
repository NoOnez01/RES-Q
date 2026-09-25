import { CaseListPage } from '@/components/CaseListPage'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  เหตุปัจจุบัน: 'Current cases',
  ไม่มีเหตุที่กำลังดำเนินการ: 'No cases in progress',
  เหตุที่ยังดำเนินการไม่เสร็จสิ้นจะแสดงที่นี่: 'Cases not yet completed will appear here',
})

export default function CurrentCases() {
  const t = useT()
  return (
    <CaseListPage
      title={t('เหตุปัจจุบัน')}
      emptyTitle={t('ไม่มีเหตุที่กำลังดำเนินการ')}
      emptyDescription={t('เหตุที่ยังดำเนินการไม่เสร็จสิ้นจะแสดงที่นี่')}
      filter={(c) => c.status !== 'completed'}
      sortBy="updatedAt"
    />
  )
}
