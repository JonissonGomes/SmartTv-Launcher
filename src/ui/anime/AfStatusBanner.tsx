import type { AfStatusNotice } from '@/domain/animefire'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './AfStatusBanner.module.css'

interface AfStatusBannerProps {
  notice: AfStatusNotice
  onDismiss: () => void
}

/** Aviso de manutenção/status da AnimeFire (mesmo papel do toaster do site). */
export function AfStatusBanner({ notice, onDismiss }: AfStatusBannerProps) {
  return (
    <div
      className={styles.banner}
      role="status"
      data-severity={notice.severity}
    >
      <p className={styles.body}>{notice.body}</p>
      <Focusable
        focusKey="ANIME_NOTICE_DISMISS"
        className={styles.dismiss}
        onEnterPress={onDismiss}
      >
        Entendi
      </Focusable>
    </div>
  )
}
