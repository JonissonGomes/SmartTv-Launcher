import { useEffect, useRef } from 'react'
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
 * Campo que abre o teclado virtual da TV ao receber foco (webOS).
 * Enter no Focusable foca o <input>; Escape/blur devolve o foco espacial.
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

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const onKeyDown = (event: KeyboardEvent) => {
      // Back webOS / Escape: sai do campo sem fechar a tela inteira
      if (event.keyCode === 461 || event.key === 'Escape') {
        input.blur()
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
        className={styles.focusShell}
        onEnterPress={() => {
          inputRef.current?.focus()
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
          onChange={(event) => {
            onChange(event.target.value.slice(0, maxLength))
          }}
          onFocus={(event) => {
            // Seleciona texto para facilitar edição no teclado virtual
            event.currentTarget.select()
          }}
        />
      </Focusable>
    </label>
  )
}
