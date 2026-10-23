import type { ReactNode } from 'react'
import type { CatalogItem, WatchEntry } from '@/domain/types'
import type { RailInsights } from '@/hooks/useHomeFeed'
import { Focusable } from '@/ui/focus/Focusable'
import { LeftFlyout } from '@/ui/layout/LeftFlyout'
import { TopBar } from '@/ui/layout/TopBar'
import styles from './Shell.module.css'

interface ShellProps {
  children: ReactNode
  continuing: WatchEntry[]
  rail: RailInsights
  onOpenItem: (item: CatalogItem) => void
  onOpenProfiles?: () => void
  showRail?: boolean
}

/** Layout: flyout esquerdo oculto + topo (só horário) + conteúdo. */
export function Shell({ children, onOpenProfiles }: ShellProps) {
  return (
    <div className={styles.shell}>
      <LeftFlyout onOpenProfiles={onOpenProfiles} />
      <Focusable focusKey="MAIN" className={styles.main} saveLastFocusedChild>
        <TopBar />
        <div className={styles.content}>{children}</div>
      </Focusable>
    </div>
  )
}
