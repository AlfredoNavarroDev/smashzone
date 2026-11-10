const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:5021'
const TOKEN_KEY = 'smashzone.token'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null
/** El AuthProvider registra aquí su logout para reaccionar a un 401 en cualquier request. */
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  onUnauthorized = fn
}

async function leerError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body?.errors) return Object.values<string[]>(body.errors).flat().join(' ')
    if (body?.title) return body.title as string
  } catch {
    /* cuerpo vacío o no JSON */
  }
  return `Error ${res.status}`
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const token = tokenStorage.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  // 401 con sesión activa = token vencido o cuenta deshabilitada. En /auth/login es un error normal.
  if (res.status === 401 && token && !path.startsWith('/api/auth/login')) onUnauthorized?.()
  if (!res.ok) throw new ApiError(res.status, await leerError(res))
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const get = <T>(path: string) => request<T>(path)
export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
export const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
