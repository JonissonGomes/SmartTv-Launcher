import { useEffect, useRef, useState } from 'react'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './TvTextField.module.css'

interface TvTextFieldProps {
  focusKey: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  /** text | search | url — layout do teclado virtual webOS */
  inputType?: 'text' | 'search' | 'url'
  className?: string
  label?: string
}

/**
 * Campo TV: Enter/clique abre o teclado; Back/sair do foco fecha.
 * O ponteiro só destaca o shell — não prende o cursor no <input>.
 */
export function TvTextField({
  focusKey,
  value,
  onChange,
  placeholder,
  maxLength = 48,
  inputType = 'text',
  className,
  label,
}: TvTextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)

  const startEditing = () => {
    setEditing(true)
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const stopEditing = () => {
    setEditing(false)
    inputRef.current?.blur()
  }

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.keyCode === 461 || event.key === 'Escape') {
        stopEditing()
        event.preventDefault()
        event.stopPropagation()
      }
    }

    input.addEventListener('keydown', onKeyDown)
    return () => {
      input.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <label className={cx(styles.wrap, className)}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <Focusable
        focusKey={focusKey}
        className={cx(styles.focusShell, editing && styles.editing)}
        onEnterPress={() => {
          startEditing()
        }}
      >
        <input
          ref={inputRef}
          className={styles.input}
          type={inputType}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          tabIndex={-1}
          readOnly={!editing}
          onChange={(event) => {
            onChange(event.target.value.slice(0, maxLength))
          }}
          onFocus={(event) => {
            if (!editing) {
              event.currentTarget.blur()
              return
            }
            event.currentTarget.select()
          }}
          onBlur={() => {
            setEditing(false)
          }}
        />
      </Focusable>
      <span className={styles.hintInline}>
        {editing
          ? 'Back fecha o teclado · setas saem do campo'
          : 'Enter ou clique para digitar / voz no teclado da TV'}
      </span>
    </label>
  )
}
