import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ปิด: 'Close',
  ยกเลิก: 'Cancel',
})

interface ConfirmationModalProps {
  open: boolean
  title: string
  /** Omit for a short, title-only confirmation -- not every confirmation
   * needs an explanatory paragraph underneath. */
  message?: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  tone?: 'primary' | 'danger'
  confirmLoading?: boolean
  icon?: React.ReactNode
  /** Extra content between the message and the buttons, e.g. the fields a
   * confirmation needs (an amount, contact details). */
  children?: React.ReactNode
}

export function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'primary',
  confirmLoading = false,
  icon,
  children,
}: ConfirmationModalProps) {
  const t = useT()
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={message}
      icon={icon}
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel ?? t('ยกเลิก')}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={confirmLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
