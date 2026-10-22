import type { ReactNode } from 'react'
import { Focusable } from '@/ui/focus/Focusable'
import { Sidebar } from '@/ui/layout/Sidebar'
import { TopBar } from '@/ui/layout/TopBar'
import styles from './Shell.module.css'

interface ShellProps {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <Focusable focusKey="MAIN" className={styles.main} saveLastFocusedChild>
        <TopBar />
        <div className={styles.content}>{children}</div>
      </Focusable>
    </div>
  )
}
