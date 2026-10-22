import {
  FocusContext,
  useFocusable,
  type UseFocusableConfig,
} from '@noriginmedia/norigin-spatial-navigation'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { cx } from '@/ui/cx'
import styles from './Focusable.module.css'

interface FocusableProps extends UseFocusableConfig {
  children: ReactNode | ((focused: boolean) => ReactNode)
  className?: string
  style?: CSSProperties
  as?: 'div' | 'button' | 'li'
  /** Sem cápsula/escala — ideal para tabs de texto */
  variant?: 'default' | 'plain'
}

export function Focusable({
  children,
  className,
  style,
  as: Tag = 'div',
  variant = 'default',
  ...config
}: FocusableProps) {
  const { ref, focused, focusKey } = useFocusable(config)

  const classes = cx(
    styles.root,
    focused && styles.focused,
    variant === 'plain' && styles.plain,
    className,
  )

  return (
    <FocusContext.Provider value={focusKey}>
      <Tag
        ref={ref as RefObject<HTMLDivElement & HTMLButtonElement & HTMLLIElement>}
        className={classes}
        style={style}
        data-focused={focused ? 'true' : 'false'}
      >
        {typeof children === 'function' ? children(focused) : children}
      </Tag>
    </FocusContext.Provider>
  )
}
