/** Usuário autenticado na API do launcher (não é sessão Youcine). */
export interface AuthUser {
  id: string
  email: string
  name: string
  picture: string | null
}

export type DevicePollStatus =
  | 'pending'
  | 'slow_down'
  | 'expired'
  | 'denied'
  | 'ready'

export interface DeviceStartResponse {
  device_code: string
  user_code: string
  verification_url: string
  verification_url_complete: string | null
  expires_in: number
  interval: number
}

export interface DevicePollPending {
  status: Exclude<DevicePollStatus, 'ready'>
}

export interface DevicePollReady {
  status: 'ready'
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

export type DevicePollResponse = DevicePollPending | DevicePollReady
