import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { cachedImageSrc } from '@/services/imageCache'

type CachedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null
}

/** <img> com cache de sessão (memória + Cache Storage). */
export function CachedImage({ src, ...rest }: CachedImageProps) {
  const [resolved, setResolved] = useState<string | undefined>(src ?? undefined)

  useEffect(() => {
    let cancelled = false
    if (!src) {
      setResolved(undefined)
      return
    }
    setResolved(src)
    void cachedImageSrc(src).then((next) => {
      if (!cancelled) setResolved(next)
    })
    return () => {
      cancelled = true
    }
  }, [src])

  if (!resolved) return null
  return <img src={resolved} {...rest} />
}
