import { useState, type ReactNode } from 'react'
import type { CatalogItem, WatchEntry } from '@/domain/types'
import type { RailInsights } from '@/hooks/useHomeFeed'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { RightRail } from '@/ui/layout/RightRail'
import { Sidebar } from '@/ui/layout/Sidebar'
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

export function Shell({
  children,
  continuing,
  rail,
  onOpenItem,
  onOpenProfiles,
  showRail = true,
}: ShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [railExpanded, setRailExpanded] = useState(false)

  return (
    <div
      className={cx(
        styles.shell,
        !showRail && styles.shellNoRail,
        sidebarExpanded && styles.shellSidebarExpanded,
        showRail && railExpanded && styles.shellRailExpanded,
      )}
    >
      <Sidebar
        onExpandedChange={setSidebarExpanded}
        onOpenProfiles={onOpenProfiles}
      />
      <Focusable focusKey="MAIN" className={styles.main} saveLastFocusedChild>
        <TopBar />
        <div className={styles.content}>{children}</div>
      </Focusable>
      {showRail ? (
        <RightRail
          continuing={continuing}
          rail={rail}
          onOpenItem={onOpenItem}
          onExpandedChange={setRailExpanded}
        />
      ) : null}
    </div>
  )
}
