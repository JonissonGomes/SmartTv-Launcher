export type EpisodeAudioKind = 'dublado' | 'legendado' | 'other'

export function episodeAudioKind(audio?: string): EpisodeAudioKind {
  const a = (audio ?? '').toLowerCase()
  if (/dub/.test(a)) return 'dublado'
  if (/leg|sub/.test(a)) return 'legendado'
  return 'other'
}

export function filterEpisodesByAudio<T extends { audio?: string }>(
  episodes: T[],
  kind: 'dublado' | 'legendado' | 'all',
): T[] {
  if (kind === 'all') return episodes
  return episodes.filter((e) => episodeAudioKind(e.audio) === kind)
}

export function availableAudioKinds<T extends { audio?: string }>(
  episodes: T[],
): Array<'dublado' | 'legendado'> {
  const hasDub = episodes.some((e) => episodeAudioKind(e.audio) === 'dublado')
  const hasLeg = episodes.some((e) => episodeAudioKind(e.audio) === 'legendado')
  const out: Array<'dublado' | 'legendado'> = []
  if (hasDub) out.push('dublado')
  if (hasLeg) out.push('legendado')
  return out
}
