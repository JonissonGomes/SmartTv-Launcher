import type { ReactNode } from 'react'
import type { WatchEntry } from '@/domain/types'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { RightRail } from '@/ui/layout/RightRail'
import { Sidebar } from '@/ui/layout/Sidebar'
import { TopBar } from '@/ui/layout/TopBar'
import styles from './Shell.module.css'

interface ShellProps {
  children: ReactNode
  onContinueEntry: (entry: WatchEntry) => void
  showRail?: boolean
}

export function Shell({ children, onContinueEntry, showRail = true }: ShellProps) {
  return (
    <div className={cx(styles.shell, !showRail && styles.shellNoRail)}>
      <Sidebar />
      <Focusable focusKey="MAIN" className={styles.main} saveLastFocusedChild>
        <TopBar />
        <div className={styles.content}>{children}</div>
      </Focusable>
      {showRail ? <RightRail onContinue={onContinueEntry} /> : null}
    </div>
  )
}
