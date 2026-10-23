import {
  FocusContext,
  setFocus,
  useFocusable,
  type UseFocusableConfig,
} from '@noriginmedia/norigin-spatial-navigation'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { cx } from '@/ui/cx'
import { scrollFocusedIntoView } from '@/ui/input/magicRemoteScroll'
import styles from './Focusable.module.css'

interface FocusableProps extends UseFocusableConfig {
  children: ReactNode | ((focused: boolean) => ReactNode)
  className?: string
  style?: CSSProperties
  as?: 'div' | 'button' | 'li'
  /** plain = tabs; nav = sidebar sem blur/scale */
  variant?: 'default' | 'plain' | 'nav'
}

export function Focusable({
  children,
  className,
  style,
  as: Tag = 'div',
  variant = 'default',
  onFocus,
  ...config
}: FocusableProps) {
  const { ref, focused, focusKey } = useFocusable({
    ...config,
    onFocus: (...args) => {
      scrollFocusedIntoView(ref.current as HTMLElement | null)
      onFocus?.(...args)
    },
  })

  const classes = cx(
    styles.root,
    focused && styles.focused,
    variant === 'plain' && styles.plain,
    variant === 'nav' && styles.nav,
    className,
  )

  return (
    <FocusContext.Provider value={focusKey}>
      <Tag
        ref={ref as RefObject<HTMLDivElement & HTMLButtonElement & HTMLLIElement>}
        className={classes}
        style={style}
        data-focused={focused ? 'true' : 'false'}
        onMouseEnter={() => {
          // Ponteiro Magic Remote ↔ foco espacial (obrigatório no guia LG).
          if (config.focusable === false) return
          void setFocus(focusKey)
        }}
      >
        {typeof children === 'function' ? children(focused) : children}
      </Tag>
    </FocusContext.Provider>
  )
}
