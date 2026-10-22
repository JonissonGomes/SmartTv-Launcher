import {
  FocusContext,
  useFocusable,
  type UseFocusableConfig,
} from '@noriginmedia/norigin-spatial-navigation'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import styles from './Focusable.module.css'

interface FocusableProps extends UseFocusableConfig {
  children: ReactNode | ((focused: boolean) => ReactNode)
  className?: string
  style?: CSSProperties
  as?: 'div' | 'button' | 'li'
}

export function Focusable({
  children,
  className,
  style,
  as: Tag = 'div',
  ...config
}: FocusableProps) {
  const { ref, focused, focusKey } = useFocusable(config)

  const classes = [
    styles.root,
    focused ? styles.focused : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

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
