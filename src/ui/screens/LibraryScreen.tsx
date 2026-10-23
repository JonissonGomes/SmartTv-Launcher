import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  isDirectMediaUrl,
  isUrlAllowedForLibrary,
  normalizeHttpsUrl,
} from '@/services/urlSafety'
import { isWebOsRuntime, launchBrowser } from '@/services/webos'
import { useSettingsStore } from '@/store/settings'
import { Focusable } from '@/ui/focus/Focusable'
import { TvTextField } from '@/ui/input/TvTextField'
import styles from './LibraryScreen.module.css'

/**
 * Biblioteca web do site próprio do usuário.
 * iframe quando o site permite; senão navegador da TV / <video> p/ MP4 direto.
 */
export function LibraryScreen() {
  const libraryBaseUrl = useSettingsStore((s) => s.libraryBaseUrl)
  const base = useMemo(
    () => normalizeHttpsUrl(libraryBaseUrl) ?? 'https://assistiranimesonline.net',
    [libraryBaseUrl],
  )

  const [currentUrl, setCurrentUrl] = useState(base)
  const [pathInput, setPathInput] = useState('')
  const [iframeBlocked, setIframeBlocked] = useState(false)
  const [message, setMessage] = useState<string>()
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setCurrentUrl(base)
    setIframeBlocked(false)
    void setFocus('LIBRARY_OPEN')
  }, [base])

  const mediaMode = isDirectMediaUrl(currentUrl)

  const goTo = (raw: string) => {
    const normalized = normalizeHttpsUrl(raw)
    if (!normalized) {
      setMessage('URL inválida.')
      return
    }
    if (!isUrlAllowedForLibrary(normalized, base)) {
      setMessage(
        `Só o host de ${new URL(base).hostname} (e subdomínios) é permitido.`,
      )
      return
    }
    setMessage(undefined)
    setIframeBlocked(false)
    setCurrentUrl(normalized)
  }

  const openExternal = () => {
    void launchBrowser(currentUrl)
      .then(() => {
        setMessage('Aberto no navegador da TV.')
      })
      .catch((err: unknown) => {
        setMessage(err instanceof Error ? err.message : 'Falha ao abrir navegador')
      })
  }

  return (
    <Focusable
      focusKey="VIEW_library"
      className={styles.screen}
      saveLastFocusedChild
    >
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Minha biblioteca</h1>
          <p className={styles.sub}>
            Site próprio · {new URL(base).hostname}
            {isWebOsRuntime() ? ' · webOS' : ' · preview'}
          </p>
        </div>
        <div className={styles.actions}>
          <Focusable
            focusKey="LIBRARY_HOME"
            className={styles.btn}
            onEnterPress={() => {
              goTo(base)
            }}
          >
            Início do site
          </Focusable>
          <Focusable
            focusKey="LIBRARY_RELOAD"
            className={styles.btnGhost}
            onEnterPress={() => {
              setIframeBlocked(false)
              if (frameRef.current) {
                frameRef.current.src = currentUrl
              } else {
                setCurrentUrl((u) => u)
              }
            }}
          >
            Recarregar
          </Focusable>
          <Focusable
            focusKey="LIBRARY_BROWSER"
            className={styles.btnGhost}
            onEnterPress={openExternal}
          >
            Abrir no navegador TV
          </Focusable>
        </div>
      </header>

      <div className={styles.pathRow}>
        <TvTextField
          focusKey="LIBRARY_PATH"
          label="Caminho ou URL (mesmo domínio)"
          value={pathInput}
          onChange={setPathInput}
          placeholder="/animes/... ou URL completa"
          inputType="url"
          maxLength={200}
        />
        <Focusable
          focusKey="LIBRARY_OPEN"
          className={styles.btn}
          onEnterPress={() => {
            const raw = pathInput.trim()
            if (!raw) {
              goTo(base)
              return
            }
            if (raw.startsWith('/')) {
              goTo(new URL(raw, base).toString())
              return
            }
            goTo(raw)
          }}
        >
          Ir
        </Focusable>
      </div>

      {message ? <p className={styles.message}>{message}</p> : null}

      <div className={styles.stage}>
        {mediaMode ? (
          <video
            className={styles.video}
            src={currentUrl}
            controls
            autoPlay
            playsInline
          />
        ) : iframeBlocked ? (
          <div className={styles.blocked}>
            <p>
              Este site bloqueia iframe (X-Frame-Options). Use o navegador da
              TV para assistir em tela cheia.
            </p>
            <Focusable
              focusKey="LIBRARY_BLOCKED_BROWSER"
              className={styles.btn}
              onEnterPress={openExternal}
            >
              Abrir no navegador TV
            </Focusable>
          </div>
        ) : (
          <iframe
            ref={frameRef}
            className={styles.frame}
            src={currentUrl}
            title="Biblioteca web"
            referrerPolicy="strict-origin-when-cross-origin"
            // sandbox permissivo o bastante p/ players do site próprio
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            onLoad={() => {
              // Se o site negar iframe, alguns browsers deixam contentDocument null
              // cross-origin — não dá para detectar com certeza; timeout ajuda.
            }}
            onError={() => {
              setIframeBlocked(true)
            }}
          />
        )}
      </div>

      <p className={styles.footer}>
        Dica: se o player do site não responder no iframe, use “Abrir no
        navegador TV”. URLs .mp4/.m3u8 abrem no player nativo do launcher.
      </p>
    </Focusable>
  )
}
