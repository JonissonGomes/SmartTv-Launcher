import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { PROFILE_COLORS, useProfilesStore } from '@/store/profiles'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './ProfilePicker.module.css'

const NAME_SUGGESTIONS = ['Bruna', 'Jonis', 'Casa', 'Kids', 'Família', 'Convidado']

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
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(PROFILE_COLORS[0])

  useEffect(() => {
    void setFocus(creating ? 'PROFILE_SUGGEST_0' : 'PROFILE_LIST')
  }, [creating])

  const submitCreate = () => {
    const profile = createProfile(name || 'Perfil', color)
    setActiveProfile(profile.id)
    setName('')
    setCreating(false)
    if (mode === 'setup') onDone()
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
          {creating ? 'Criar perfil' : 'Quem está assistindo?'}
        </h2>
        <p className={styles.hint}>
          O histórico e as recomendações ficam ligados ao perfil ativo.
        </p>

        {creating ? (
          <div className={styles.create}>
            <p className={styles.fieldLabel}>Escolha um nome</p>
            <div className={styles.suggestions}>
              {NAME_SUGGESTIONS.map((suggestion, index) => (
                <Focusable
                  key={suggestion}
                  focusKey={`PROFILE_SUGGEST_${String(index)}`}
                  className={cx(
                    styles.suggest,
                    name === suggestion && styles.suggestActive,
                  )}
                  onEnterPress={() => {
                    setName(suggestion)
                  }}
                >
                  {suggestion}
                </Focusable>
              ))}
            </div>

            <label className={styles.inputWrap}>
              <span className={styles.fieldLabel}>Ou digite</span>
              <input
                className={styles.input}
                value={name}
                maxLength={24}
                placeholder="Nome do perfil"
                onChange={(event) => {
                  setName(event.target.value.slice(0, 24))
                }}
              />
            </label>

            <p className={styles.fieldLabel}>Cor do avatar</p>
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
                focusKey="PROFILE_SAVE"
                className={styles.btn}
                onEnterPress={submitCreate}
              >
                Salvar perfil
              </Focusable>
              {mode === 'switch' && profiles.length > 0 ? (
                <Focusable
                  focusKey="PROFILE_CANCEL_CREATE"
                  className={cx(styles.btn, styles.btnGhost)}
                  onEnterPress={() => {
                    setCreating(false)
                  }}
                >
                  Voltar
                </Focusable>
              ) : null}
            </div>
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
                </Focusable>
              ))}
            </Focusable>

            <div className={styles.actions}>
              <Focusable
                focusKey="PROFILE_NEW"
                className={styles.btn}
                onEnterPress={() => {
                  setCreating(true)
                  setName('')
                }}
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
