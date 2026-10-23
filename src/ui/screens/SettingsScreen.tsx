import { useEffect, useState } from 'react'
import { PLATFORM_ORDER, APP_CONFIGS } from '@/config/apps'
import {
  netflixRowsToEntries,
  parseNetflixCsv,
} from '@/services/importers/netflixCsv'
import {
  isWebOsRuntime,
  launchApp,
  listInstalledApps,
  type WebOsInstalledApp,
} from '@/services/webos'
import { normalizeHttpsUrl } from '@/services/urlSafety'
import { useHistoryStore } from '@/store/history'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { TvTextField } from '@/ui/input/TvTextField'
import styles from './SettingsScreen.module.css'

export function SettingsScreen() {
  const ownedPlatforms = useSettingsStore((s) => s.ownedPlatforms)
  const togglePlatform = useSettingsStore((s) => s.togglePlatform)
  const libraryBaseUrl = useSettingsStore((s) => s.libraryBaseUrl)
  const setLibraryBaseUrl = useSettingsStore((s) => s.setLibraryBaseUrl)
  const importEntries = useHistoryStore((s) => s.importEntries)
  const clearHistory = useHistoryStore((s) => s.clear)
  const [libraryDraft, setLibraryDraft] = useState(libraryBaseUrl)

  useEffect(() => {
    setLibraryDraft(libraryBaseUrl)
  }, [libraryBaseUrl])

  const [apps, setApps] = useState<WebOsInstalledApp[]>([])
  const [csvText, setCsvText] = useState(
    'Title,Date\nStranger Things: Season 1: Chapter 1,1/1/2026\nInterestelar,2/1/2026',
  )
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    void listInstalledApps().then(setApps)
  }, [])

  return (
    <Focusable focusKey="VIEW_settings" className={styles.screen} saveLastFocusedChild>
      <section className={styles.section}>
        <h2>Suas plataformas</h2>
        <p>Usadas para bônus nas recomendações.</p>
        <div className={styles.row}>
          {PLATFORM_ORDER.map((platform) => {
            const on = ownedPlatforms.includes(platform)
            return (
              <Focusable
                key={platform}
                focusKey={`SETTINGS_PLATFORM_${platform}`}
                className={cx(styles.chip, on && styles.chipOn)}
                onEnterPress={() => {
                  togglePlatform(platform)
                }}
              >
                {APP_CONFIGS[platform].label}
              </Focusable>
            )
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Player de Animes</h2>
        <p>
          Catálogo via API do AnimeFire (padrão:{' '}
          <code>https://animefire.one</code>).
        </p>
        <TvTextField
          focusKey="SETTINGS_LIBRARY_URL"
          label="URL do site"
          value={libraryDraft}
          onChange={setLibraryDraft}
          placeholder="https://seu-site.com"
          inputType="url"
          maxLength={120}
        />
        <Focusable
          focusKey="SETTINGS_LIBRARY_SAVE"
          className={styles.btn}
          onEnterPress={() => {
            const next = normalizeHttpsUrl(libraryDraft)
            if (!next) {
              setMessage('URL inválida. Use https://…')
              return
            }
            setLibraryBaseUrl(next)
            setLibraryDraft(next)
            setMessage(`Biblioteca: ${next}`)
          }}
        >
          Salvar URL da biblioteca
        </Focusable>
      </section>

      <section className={styles.section}>
        <h2>Apps instalados / webOS</h2>
        <p>
          Runtime:{' '}
          <strong>{isWebOsRuntime() ? 'TV (Luna OK)' : 'mock (sem webOS)'}</strong>
          . Use “Testar” para abrir cada streaming.
        </p>
        <div className={styles.list}>
          {apps.map((app) => (
            <div key={app.id} className={styles.appId}>
              {app.id}
              {app.title ? ` — ${app.title}` : ''}
            </div>
          ))}
        </div>
        <div className={styles.row}>
          {PLATFORM_ORDER.map((platform) => (
            <Focusable
              key={`test-${platform}`}
              focusKey={`SETTINGS_TEST_${platform}`}
              className={styles.btn}
              onEnterPress={() => {
                void launchApp(platform)
                  .then(() => {
                    setMessage(`Abriu ${APP_CONFIGS[platform].label}.`)
                  })
                  .catch((err: unknown) => {
                    const text =
                      err instanceof Error ? err.message : 'falha desconhecida'
                    setMessage(
                      `Não abriu ${APP_CONFIGS[platform].label}: ${text}`,
                    )
                  })
              }}
            >
              Testar {APP_CONFIGS[platform].label}
            </Focusable>
          ))}
        </div>
        {message ? <p>{message}</p> : null}
      </section>

      <section className={styles.section}>
        <h2>Importar CSV Netflix</h2>
        <p>Cole o conteúdo do arquivo de Atividade de visualização.</p>
        <Focusable
          focusKey="SETTINGS_CSV"
          onEnterPress={() => {
            const next = window.prompt('Cole o CSV da Netflix', csvText)
            if (next !== null) setCsvText(next)
          }}
        >
          <textarea
            className={styles.textarea}
            readOnly
            value={csvText}
            aria-label="CSV Netflix"
          />
        </Focusable>
        <Focusable
          focusKey="SETTINGS_CSV_IMPORT"
          className={styles.btn}
          onEnterPress={() => {
            const rows = parseNetflixCsv(csvText)
            const entries = netflixRowsToEntries(rows)
            importEntries(entries)
            setMessage(`Importados ${String(entries.length)} itens.`)
          }}
        >
          Importar
        </Focusable>
        {message ? <p>{message}</p> : null}
      </section>

      <section className={styles.section}>
        <h2>Histórico</h2>
        <Focusable
          focusKey="SETTINGS_CLEAR"
          className={cx(styles.btn, styles.danger)}
          onEnterPress={() => {
            clearHistory()
            setMessage('Histórico limpo.')
          }}
        >
          Limpar histórico
        </Focusable>
      </section>
    </Focusable>
  )
}
