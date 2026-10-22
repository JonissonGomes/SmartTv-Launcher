import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { CATEGORY_GENRES } from '@/services/tmdb'
import { PROFILE_COLORS, useProfilesStore } from '@/store/profiles'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { TvTextField } from '@/ui/input/TvTextField'
import styles from './ProfilePicker.module.css'

type CreateStep = 'name' | 'color' | 'prefs'

interface ProfilePickerProps {
  mode?: 'setup' | 'switch'
  onDone: () => void
}

export function ProfilePicker({ mode = 'switch', onDone }: ProfilePickerProps) {
  const profiles = useProfilesStore((s) => s.profiles)
  const activeProfileId = useProfilesStore((s) => s.activeProfileId)
  const createProfile = useProfilesStore((s) => s.createProfile)
  const setActiveProfile = useProfilesStore((s) => s.setActiveProfile)
  const removeProfile = useProfilesStore((s) => s.removeProfile)

  const [creating, setCreating] = useState(mode === 'setup' || profiles.length === 0)
  const [step, setStep] = useState<CreateStep>('name')
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(PROFILE_COLORS[0])
  const [prefs, setPrefs] = useState<number[]>([])

  useEffect(() => {
    if (!creating) {
      void setFocus('PROFILE_LIST')
      return
    }
    if (step === 'name') void setFocus('PROFILE_NAME')
    if (step === 'color') void setFocus(`PROFILE_COLOR_${PROFILE_COLORS[0].replace('#', '')}`)
    if (step === 'prefs') void setFocus('PROFILE_PREF_0')
  }, [creating, step])

  const resetCreate = () => {
    setCreating(true)
    setStep('name')
    setName('')
    setColor(PROFILE_COLORS[0])
    setPrefs([])
  }

  const submitCreate = () => {
    const profile = createProfile(name || 'Perfil', {
      color,
      preferredGenreIds: prefs,
    })
    setActiveProfile(profile.id)
    setCreating(false)
    setStep('name')
    setName('')
    setPrefs([])
    if (mode === 'setup') onDone()
  }

  const togglePref = (genreId: number) => {
    setPrefs((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId].slice(0, 6),
    )
  }

  return (
    <div className={styles.backdrop}>
      <Focusable
        focusKey="PROFILE_PICKER"
        className={styles.panel}
        isFocusBoundary
      >
        <p className={styles.kicker}>
          {mode === 'setup' ? 'Bem-vindo' : 'Perfis'}
        </p>
        <h2 className={styles.title}>
          {creating
            ? step === 'name'
              ? 'Como se chama?'
              : step === 'color'
                ? 'Escolha uma cor'
                : 'O que você gosta?'
            : 'Quem está assistindo?'}
        </h2>
        <p className={styles.hint}>
          {creating
            ? step === 'prefs'
              ? 'Selecione até 6 categorias para personalizar o catálogo.'
              : 'Use o teclado da TV no campo de texto (Enter para editar).'
            : 'O histórico e as recomendações ficam ligados ao perfil ativo.'}
        </p>

        {creating ? (
          <div className={styles.create}>
            {step === 'name' ? (
              <>
                <TvTextField
                  focusKey="PROFILE_NAME"
                  label="Nome do perfil"
                  value={name}
                  onChange={setName}
                  placeholder="Digite o nome"
                  maxLength={24}
                  inputType="text"
                />
                <div className={styles.actions}>
                  <Focusable
                    focusKey="PROFILE_NEXT_COLOR"
                    className={styles.btn}
                    onEnterPress={() => {
                      if (!name.trim()) setName('Perfil')
                      setStep('color')
                    }}
                  >
                    Continuar
                  </Focusable>
                </div>
              </>
            ) : null}

            {step === 'color' ? (
              <>
                <div className={styles.preview}>
                  <span className={styles.previewAvatar} style={{ background: color }}>
                    {(name || 'P').slice(0, 1).toUpperCase()}
                  </span>
                  <strong>{name || 'Perfil'}</strong>
                </div>
                <div className={styles.colors}>
                  {PROFILE_COLORS.map((c) => (
                    <Focusable
                      key={c}
                      focusKey={`PROFILE_COLOR_${c.replace('#', '')}`}
                      className={cx(styles.swatch, color === c && styles.swatchActive)}
                      style={{ background: c }}
                      onEnterPress={() => {
                        setColor(c)
                      }}
                    >
                      <span className="sr-only">{c}</span>
                    </Focusable>
                  ))}
                </div>
                <div className={styles.actions}>
                  <Focusable
                    focusKey="PROFILE_BACK_NAME"
                    className={cx(styles.btn, styles.btnGhost)}
                    onEnterPress={() => {
                      setStep('name')
                    }}
                  >
                    Voltar
                  </Focusable>
                  <Focusable
                    focusKey="PROFILE_NEXT_PREFS"
                    className={styles.btn}
                    onEnterPress={() => {
                      setStep('prefs')
                    }}
                  >
                    Continuar
                  </Focusable>
                </div>
              </>
            ) : null}

            {step === 'prefs' ? (
              <>
                <div className={styles.prefGrid}>
                  {CATEGORY_GENRES.map((genre, index) => (
                    <Focusable
                      key={genre.id}
                      focusKey={`PROFILE_PREF_${String(index)}`}
                      className={cx(
                        styles.prefChip,
                        prefs.includes(genre.id) && styles.prefChipActive,
                      )}
                      onEnterPress={() => {
                        togglePref(genre.id)
                      }}
                    >
                      {genre.label}
                    </Focusable>
                  ))}
                </div>
                <div className={styles.actions}>
                  <Focusable
                    focusKey="PROFILE_BACK_COLOR"
                    className={cx(styles.btn, styles.btnGhost)}
                    onEnterPress={() => {
                      setStep('color')
                    }}
                  >
                    Voltar
                  </Focusable>
                  <Focusable
                    focusKey="PROFILE_SAVE"
                    className={styles.btn}
                    onEnterPress={submitCreate}
                  >
                    Criar perfil
                    {prefs.length > 0 ? ` (${String(prefs.length)})` : ''}
                  </Focusable>
                </div>
              </>
            ) : null}

            {mode === 'switch' && profiles.length > 0 && step === 'name' ? (
              <Focusable
                focusKey="PROFILE_CANCEL_CREATE"
                className={cx(styles.btn, styles.btnGhost)}
                onEnterPress={() => {
                  setCreating(false)
                }}
              >
                Cancelar
              </Focusable>
            ) : null}
          </div>
        ) : (
          <>
            <Focusable
              focusKey="PROFILE_LIST"
              className={styles.list}
              saveLastFocusedChild
            >
              {profiles.map((profile) => (
                <Focusable
                  key={profile.id}
                  focusKey={`PROFILE_ITEM_${profile.id}`}
                  className={cx(
                    styles.card,
                    profile.id === activeProfileId && styles.cardActive,
                  )}
                  onEnterPress={() => {
                    setActiveProfile(profile.id)
                    onDone()
                  }}
                >
                  <span
                    className={styles.avatar}
                    style={{ background: profile.color }}
                  >
                    {profile.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.cardName}>{profile.name}</span>
                  {(profile.preferredGenreIds?.length ?? 0) > 0 ? (
                    <span className={styles.cardMeta}>
                      {String(profile.preferredGenreIds.length)} gostos
                    </span>
                  ) : null}
                </Focusable>
              ))}
            </Focusable>

            <div className={styles.actions}>
              <Focusable
                focusKey="PROFILE_NEW"
                className={styles.btn}
                onEnterPress={resetCreate}
              >
                Novo perfil
              </Focusable>
              {activeProfileId && profiles.length > 1 ? (
                <Focusable
                  focusKey="PROFILE_DELETE"
                  className={cx(styles.btn, styles.btnGhost)}
                  onEnterPress={() => {
                    removeProfile(activeProfileId)
                  }}
                >
                  Remover ativo
                </Focusable>
              ) : null}
              <Focusable
                focusKey="PROFILE_CLOSE"
                className={cx(styles.btn, styles.btnGhost)}
                onEnterPress={onDone}
              >
                Fechar
              </Focusable>
            </div>
          </>
        )}
      </Focusable>
    </div>
  )
}
