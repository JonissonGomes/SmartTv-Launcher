import { imageUrl, youtubeThumbUrl } from '@/services/tmdb'
import styles from './TrailerArt.module.css'

interface TrailerArtProps {
  backdropPath?: string | null
  posterPath?: string | null
  youtubeKey?: string
  alt?: string
  className?: string
}

/**
 * Arte de sinopse sem iframe YouTube.
 * No webOS/Simulator o embed falha com erro 153 (Referer vazio).
 */
export function TrailerArt({
  backdropPath,
  posterPath,
  youtubeKey,
  alt = '',
  className,
}: TrailerArtProps) {
  const backdrop = imageUrl(backdropPath ?? posterPath, 'w780')
  const thumb = youtubeKey ? youtubeThumbUrl(youtubeKey) : undefined
  const src = thumb ?? backdrop

  if (!src) {
    return <div className={className ? `${styles.empty} ${className}` : styles.empty} />
  }

  return (
    <img
      className={className ? `${styles.media} ${className}` : styles.media}
      src={src}
      alt={alt}
      decoding="async"
    />
  )
}
