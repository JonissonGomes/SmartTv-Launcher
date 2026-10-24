import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './AccountScreen.module.css'

function qrUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data)}`
}

function GoogleGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
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
  const waiting = Boolean(
    phase === 'waiting' && userCode && verificationUrl,
  )

  return (
    <Focusable
      focusKey="VIEW_account"
      className={styles.screen}
      saveLastFocusedChild
    >
      <div className={styles.stage}>
        <section className={styles.card}>
          <div className={styles.brandMark}>
            <GoogleGlyph />
          </div>
          <p className={styles.eyebrow}>Conta do launcher</p>

          {authenticated ? (
            <>
              <h1 className={styles.title}>Você está conectado</h1>
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
                <span className={styles.statusPill}>Google · ativo</span>
              </div>
              <p className={styles.lead}>
                Esta sessão serve para o SmartTv Launcher (preferências e
                recursos futuros na nuvem).
              </p>
              <div className={styles.actions}>
                <Focusable
                  focusKey="ACCOUNT_LOGOUT"
                  className={cx(styles.btn, styles.danger)}
                  onEnterPress={() => {
                    void logout()
                  }}
                >
                  Sair da conta
                </Focusable>
              </div>
            </>
          ) : null}

          {!authenticated && waiting ? (
            <>
              <h1 className={styles.title}>Confirme no celular</h1>
              <p className={styles.lead}>
                Abra o link, digite o código abaixo ou escaneie o QR. A TV
                entra sozinha quando o Google autorizar.
              </p>
              <ol className={styles.steps}>
                <li className={styles.step}>
                  <span className={styles.stepNum}>1</span>
                  Celular ou PC
                </li>
                <li className={styles.step}>
                  <span className={styles.stepNum}>2</span>
                  Digite o código
                </li>
                <li className={styles.step}>
                  <span className={styles.stepNum}>3</span>
                  Volte à TV
                </li>
              </ol>
              <div className={styles.codePanel}>
                <div className={styles.userCode}>{userCode!}</div>
                <img
                  className={styles.qr}
                  src={qrUrl(verificationUrl!)}
                  alt="QR code de login Google"
                />
                <p className={styles.hint}>{verificationUrl}</p>
                <p className={styles.waiting}>
                  <span className={styles.pulse} />
                  Aguardando autorização…
                </p>
              </div>
              <div className={styles.actions}>
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
          ) : null}

          {!authenticated && !waiting ? (
            <>
              <h1 className={styles.title}>Entrar com Google</h1>
              <p className={styles.lead}>
                Use o controle da TV: geramos um código curto. A autorização
                acontece no celular — sem digitar e-mail na televisão.
              </p>
              <ol className={styles.steps}>
                <li className={styles.step}>
                  <span className={styles.stepNum}>1</span>
                  Gerar código
                </li>
                <li className={styles.step}>
                  <span className={styles.stepNum}>2</span>
                  Autorizar no Google
                </li>
                <li className={styles.step}>
                  <span className={styles.stepNum}>3</span>
                  Conta na TV
                </li>
              </ol>
              <div className={styles.actions}>
                <Focusable
                  focusKey="ACCOUNT_LOGIN"
                  className={styles.btnGoogle}
                  onEnterPress={() => {
                    clearError()
                    void startLogin()
                  }}
                >
                  <GoogleGlyph />
                  {phase === 'starting'
                    ? 'Conectando…'
                    : 'Continuar com Google'}
                </Focusable>
              </div>
            </>
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}

          <p className={styles.note}>
            Este login é só da conta do SmartTv Launcher (histórico e perfil).
            Não conecta a Netflix, Disney+ nem outros apps.
          </p>
        </section>
      </div>
    </Focusable>
  )
}
