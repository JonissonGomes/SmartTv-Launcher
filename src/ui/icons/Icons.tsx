import type { CSSProperties, ReactNode } from 'react'
import type { AppView, Platform } from '@/domain/types'

interface IconProps {
  size?: number
  style?: CSSProperties
  className?: string
}

function Svg({
  size = 28,
  style,
  className,
  children,
  viewBox = '0 0 24 24',
}: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="currentColor"
      aria-hidden
      className={className}
      style={style}
    >
      {children}
    </svg>
  )
}

export function PlatformIcon({
  platform,
  size = 26,
}: {
  platform: Platform
  size?: number
}) {
  switch (platform) {
    case 'netflix':
      return (
        <Svg size={size} style={{ color: '#E50914' }}>
          <path d="M5 3h3.2l5.1 12.2V3H17v18h-3.3L8.5 8.5V21H5V3z" />
        </Svg>
      )
    case 'disney':
      return (
        <Svg size={size} style={{ color: '#5B9BFF' }}>
          <path d="M12 3c4.5 3.2 7 6.8 7 10.2A4.8 4.8 0 0 1 12 18a4.8 4.8 0 0 1-7-4.8C5 9.8 7.5 6.2 12 3zm0 4.2c-2.2 1.8-3.4 3.7-3.4 5.5A1.4 1.4 0 0 0 12 14.2a1.4 1.4 0 0 0 3.4-1.5c0-1.8-1.2-3.7-3.4-5.5z" />
        </Svg>
      )
    case 'hbomax':
      return (
        <Svg size={size} style={{ color: '#C5CCD6' }} viewBox="0 0 64 24">
          <text
            x="2"
            y="18"
            fontSize="15"
            fontWeight="800"
            fontFamily="Segoe UI, sans-serif"
          >
            max
          </text>
        </Svg>
      )
    case 'globoplay':
      return (
        <Svg size={size} style={{ color: '#F26522' }}>
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="4" />
        </Svg>
      )
    case 'youtube':
      return (
        <Svg size={size} style={{ color: '#FF0000' }}>
          <path d="M23 8.5a3 3 0 0 0-2.1-2.1C19 6 12 6 12 6s-7 0-8.9.4A3 3 0 0 0 1 8.5 31.6 31.6 0 0 0 1 12a31.6 31.6 0 0 0 .1 3.5 3 3 0 0 0 2.1 2.1C5 18 12 18 12 18s7 0 8.9-.4a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 23 12a31.6 31.6 0 0 0 0-3.5zM10 14.5v-5l5 2.5-5 2.5z" />
        </Svg>
      )
    case 'animefire':
      return (
        <Svg size={size} style={{ color: '#E50914' }}>
          <path d="M12 2 4 7v10l8 5 8-5V7l-8-5zm0 2.2 5.5 3.4v6.8L12 17.8l-5.5-3.4V7.6L12 4.2zM9 10.5h6v2H9v-2z" />
        </Svg>
      )
  }
}

export function NavIcon({ view, size = 24 }: { view: AppView; size?: number }) {
  switch (view) {
    case 'home':
    case 'platform':
      return (
        <Svg size={size}>
          <path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3z" />
        </Svg>
      )
    case 'categories':
      return (
        <Svg size={size}>
          <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
        </Svg>
      )
    case 'surprise':
      return (
        <Svg size={size}>
          <path d="M12 2 9.5 8.5 3 9.2l5 4.6L6.5 20 12 16.7 17.5 20 16 13.8l5-4.6-6.5-.7L12 2zm0 5.2 1.1 2.9 3.1.3-2.4 2.2.7 3-2.5-1.5-2.5 1.5.7-3-2.4-2.2 3.1-.3L12 7.2z" />
        </Svg>
      )
    case 'games':
      return (
        <Svg size={size}>
          <path d="M6 8h12a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-2a4 4 0 0 1 4-4zm2 3v2h2v-2H8zm8.5-.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM15 14.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z" />
        </Svg>
      )
    case 'cast':
      return (
        <Svg size={size}>
          <path d="M3 5h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-7v2h2v2H8v-2h2v-2H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v8h16V7H4zm1 10a3 3 0 0 0 3 3v-2a1 1 0 0 1-1-1H5zm0-3a6 6 0 0 0 6 6v-2a4 4 0 0 1-4-4H5zm0-3a9 9 0 0 0 9 9v-2a7 7 0 0 1-7-7H5z" />
        </Svg>
      )
    case 'history':
      return (
        <Svg size={size}>
          <path d="M12 4a8 8 0 1 1-7.5 10.5H7l-3 3-3-3h2.1A10 10 0 1 0 12 2v2zm1 3h-2v6l5 3 1-1.7-4-2.3V7z" />
        </Svg>
      )
    case 'search':
      return (
        <Svg size={size}>
          <path d="M10 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm8.7 12.3-3.8-3.8 1.4-1.4 3.8 3.8-1.4 1.4z" />
        </Svg>
      )
    case 'library':
    case 'anime':
      return (
        <Svg size={size}>
          <path d="M4 3h4v18H4V3zm6 0h4v18h-4V3zm6 0h4v18h-4V3z" />
        </Svg>
      )
    case 'settings':
      return (
        <Svg size={size}>
          <path d="M19.1 12.6a7.5 7.5 0 0 0 0-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1-.6l-.4-2.6H10.7l-.4 2.6a7.6 7.6 0 0 0-1 .6l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 1.2l-2 1.6 2 3.4 2.4-1c.3.2.7.5 1 .6l.4 2.6h4.6l.4-2.6c.3-.1.7-.4 1-.6l2.4 1 2-3.4-2-1.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
        </Svg>
      )
    case 'account':
      return (
        <Svg size={size}>
          <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.25c-4 0-7.5 2-7.5 4.5V21h15v-2.25c0-2.5-3.5-4.5-7.5-4.5z" />
        </Svg>
      )
  }
}

export function BrandIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg size={size} style={{ color: 'currentColor' }}>
      <path d="M4 5h6l2 5 2-5h6v14h-4V11l-2.5 6h-3L8 11v8H4V5z" />
    </Svg>
  )
}
