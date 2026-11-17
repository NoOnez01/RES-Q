import { Button } from './Button'
import { Dialog } from './Dialog'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ปิด: 'Close',
})

interface InfoModalProps {
  open: boolean
  title: string
  message: string
  icon?: React.ReactNode
  onClose: () => void
  actionLabel?: string
  onAction?: () => void
}

export function InfoModal({ open, title, message, icon, onClose, actionLabel, onAction }: InfoModalProps) {
  const t = useT()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      icon={icon}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('ปิด')}
          </Button>
          {actionLabel && onAction && (
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </>
      }
    />
  )
}
