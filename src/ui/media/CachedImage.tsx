import type { ImgHTMLAttributes } from 'react'

type CachedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null
}

/**
 * Imagem direta (cache HTTP do browser).
 * Evita fetch→blob no render — isso matava FPS no webOS.
 */
export function CachedImage({ src, ...rest }: CachedImageProps) {
  if (!src) return null
  return <img src={src} {...rest} />
}
