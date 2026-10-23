/** Ícones SVG simples para tiles de catálogo/gênero (TV-friendly). */

export function SectionIcon({ id }: { id: string }) {
  const common = {
    width: 48,
    height: 48,
    viewBox: '0 0 48 48',
    fill: 'none',
    'aria-hidden': true as const,
  }
  switch (id) {
    case 'filmes':
      return (
        <svg {...common}>
          <rect
            x="8"
            y="12"
            width="32"
            height="24"
            rx="3"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="M20 20l12 6-12 6V20z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
      )
    case 'em-breve':
      return (
        <svg {...common}>
          <circle
            cx="24"
            cy="24"
            r="14"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="M24 16v9l6 4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect
            x="10"
            y="8"
            width="20"
            height="28"
            rx="3"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="M30 14h6v22a3 3 0 01-3 3H16"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )
  }
}

export function GenreIcon({ genre }: { genre: string }) {
  const common = {
    width: 36,
    height: 36,
    viewBox: '0 0 36 36',
    fill: 'none',
    'aria-hidden': true as const,
  }
  const g = genre.toLowerCase()
  if (g.includes('ação') || g.includes('acao')) {
    return (
      <svg {...common}>
        <path
          d="M8 26L18 8l10 18H8z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (g.includes('aventura')) {
    return (
      <svg {...common}>
        <circle cx="18" cy="18" r="12" stroke="currentColor" strokeWidth="2.2" />
        <path
          d="M18 8v20M8 18h20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (g.includes('comédia') || g.includes('comedia')) {
    return (
      <svg {...common}>
        <circle cx="18" cy="18" r="12" stroke="currentColor" strokeWidth="2.2" />
        <path
          d="M12 15h.01M24 15h.01M12 22c2 2.5 10 2.5 12 0"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (g.includes('drama')) {
    return (
      <svg {...common}>
        <circle cx="18" cy="18" r="12" stroke="currentColor" strokeWidth="2.2" />
        <path
          d="M12 15h.01M24 15h.01M12 24c2-2.5 10-2.5 12 0"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (g.includes('fantasia')) {
    return (
      <svg {...common}>
        <path
          d="M18 6l2.5 8H29l-6.5 4.5L25 27l-7-5-7 5 2.5-8.5L7 14h8.5L18 6z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (g.includes('romance')) {
    return (
      <svg {...common}>
        <path
          d="M18 30s-10-6.5-10-14a5.5 5.5 0 0110-3 5.5 5.5 0 0110 3c0 7.5-10 14-10 14z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (g.includes('terror')) {
    return (
      <svg {...common}>
        <path
          d="M8 28c2-10 6-16 10-18 4 2 8 8 10 18H8z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 22h.01M22 22h.01"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (g.includes('sci')) {
    return (
      <svg {...common}>
        <circle cx="18" cy="18" r="5" stroke="currentColor" strokeWidth="2.2" />
        <ellipse
          cx="18"
          cy="18"
          rx="14"
          ry="6"
          stroke="currentColor"
          strokeWidth="2"
          transform="rotate(30 18 18)"
        />
      </svg>
    )
  }
  if (g.includes('shounen')) {
    return (
      <svg {...common}>
        <path
          d="M10 26V12l8-4 8 4v14l-8 4-8-4z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect
        x="8"
        y="6"
        width="20"
        height="24"
        rx="3"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M12 14h12M12 20h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
