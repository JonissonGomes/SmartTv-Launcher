import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './AccountScreen.module.css'

function qrUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`
}

export function AccountScreen() {
  const phase = useAuthStore((s) => s.phase)
  const user = useAuthStore((s) => s.user)
  const userCode = useAuthStore((s) => s.userCode)
  const verificationUrl = useAuthStore((s) => s.verificationUrl)
  const pollIntervalSec = useAuthStore((s) => s.pollIntervalSec)
  const error = useAuthStore((s) => s.error)
  const startLogin = useAuthStore((s) => s.startLogin)
  const pollOnce = useAuthStore((s) => s.pollOnce)
  const logout = useAuthStore((s) => s.logout)
  const cancelLogin = useAuthStore((s) => s.cancelLogin)
  const clearError = useAuthStore((s) => s.clearError)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (phase !== 'waiting') {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      const result = await pollOnce()
      if (cancelled || result !== 'pending') return
      const waitMs = useAuthStore.getState().pollIntervalSec * 1000
      timerRef.current = window.setTimeout(() => {
        void tick()
      }, waitMs)
    }

    timerRef.current = window.setTimeout(() => {
      void tick()
    }, pollIntervalSec * 1000)

    return () => {
      cancelled = true
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [phase, pollIntervalSec, pollOnce])

  const authenticated = phase === 'authenticated' && user

  return (
    <Focusable
      focusKey="VIEW_account"
      className={styles.screen}
      saveLastFocusedChild
    >
      <section className={styles.section}>
        <h2>Conta do launcher</h2>
        <p>
          Login com Google via código (ideal para o controle da TV). Esta sessão
          é só do SmartTv Launcher — não conecta ao Youcine nem a outros apps.
        </p>
      </section>

      {authenticated ? (
        <section className={styles.section}>
          <div className={styles.profile}>
            {user.picture ? (
              <img
                className={styles.avatar}
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={styles.avatarFallback}>
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className={styles.meta}>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <div className={styles.row}>
            <Focusable
              focusKey="ACCOUNT_LOGOUT"
              className={cx(styles.btn, styles.danger)}
              onEnterPress={() => {
                void logout()
              }}
            >
              Sair
            </Focusable>
          </div>
        </section>
      ) : null}

      {!authenticated ? (
        <section className={styles.section}>
          {phase === 'waiting' && userCode && verificationUrl ? (
            <>
              <p>
                No celular ou PC, abra o link e digite o código (ou escaneie o
                QR):
              </p>
              <div className={styles.codeBox}>
                <div className={styles.userCode}>{userCode}</div>
                <img
                  className={styles.qr}
                  src={qrUrl(verificationUrl)}
                  alt="QR code de login"
                />
                <p className={styles.hint}>{verificationUrl}</p>
                <p className={styles.hint}>Aguardando autorização…</p>
              </div>
              <div className={styles.row}>
                <Focusable
                  focusKey="ACCOUNT_CANCEL"
                  className={cx(styles.btn, styles.btnSecondary)}
                  onEnterPress={() => {
                    cancelLogin()
                  }}
                >
                  Cancelar
                </Focusable>
              </div>
            </>
          ) : (
            <>
              <p>
                Você será autenticado no servidor do launcher (Render). Depois
                poderá sincronizar preferências futuras.
              </p>
              <Focusable
                focusKey="ACCOUNT_LOGIN"
                className={styles.btn}
                onEnterPress={() => {
                  clearError()
                  void startLogin()
                }}
              >
                {phase === 'starting'
                  ? 'Iniciando…'
                  : 'Entrar com Google'}
              </Focusable>
            </>
          )}
          {error ? <p className={styles.error}>{error}</p> : null}
        </section>
      ) : null}
    </Focusable>
  )
}
