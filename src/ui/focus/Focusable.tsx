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

const LEFT_EDGE_PX = 110

export function Focusable({
  children,
  className,
  style,
  as: Tag = 'div',
  variant = 'default',
  onFocus,
  onEnterPress,
  onArrowPress,
  ...config
}: FocusableProps) {
  const { ref, focused, focusKey } = useFocusable({
    ...config,
    onEnterPress,
    onFocus: (...args) => {
      // Flyout / player: não forçar scroll da página
      if (
        !focusKey.startsWith('FLY_') &&
        !focusKey.startsWith('PLAYER_')
      ) {
        scrollFocusedIntoView(ref.current as HTMLElement | null)
      }
      onFocus?.(...args)
    },
    onArrowPress: (direction, props, details) => {
      if (onArrowPress?.(direction, props, details) === false) return false

      // D-pad esquerda na borda → abre menu lateral
      if (
        direction === 'left' &&
        variant !== 'nav' &&
        !focusKey.startsWith('FLY_') &&
        !focusKey.startsWith('PLAYER_') &&
        !focusKey.startsWith('PROFILE_') &&
        !focusKey.startsWith('DETAILS_') &&
        !focusKey.startsWith('TITLE_')
      ) {
        const el = ref.current as HTMLElement | null
        if (el && el.getBoundingClientRect().left <= LEFT_EDGE_PX) {
          void setFocus('FLY_PROFILE')
          return false
        }
      }
      return true
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
          if (config.focusable === false) return
          const active = document.activeElement
          if (
            (active instanceof HTMLInputElement ||
              active instanceof HTMLTextAreaElement) &&
            ref.current &&
            !ref.current.contains(active)
          ) {
            active.blur()
          }
          void setFocus(focusKey)
        }}
        onClick={(event) => {
          if (config.focusable === false || !onEnterPress) return
          if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement
          ) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          void setFocus(focusKey)
          onEnterPress({} as never, {} as never)
        }}
      >
        {typeof children === 'function' ? children(focused) : children}
      </Tag>
    </FocusContext.Provider>
  )
}
