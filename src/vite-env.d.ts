/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API Read Access Token (JWT) — preferido */
  readonly VITE_TMDB_TOKEN?: string
  /** API Key v3 — fallback via ?api_key= */
  readonly VITE_TMDB_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
