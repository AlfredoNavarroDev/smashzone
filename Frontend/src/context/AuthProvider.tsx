import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { setUnauthorizedHandler, tokenStorage } from '../api/http'
import type { RolNombre, Usuario } from '../api/types'
import { AuthContext, type AuthContextValue } from './authContext'

const USER_KEY = 'smashzone.usuario'
const HEARTBEAT_MS = 60_000

function usuarioGuardado(): Usuario | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw && tokenStorage.get() ? (JSON.parse(raw) as Usuario) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuarioState] = useState<Usuario | null>(usuarioGuardado)

  const logout = useCallback(() => {
    tokenStorage.clear()
    localStorage.removeItem(USER_KEY)
    setUsuarioState(null)
  }, [])

  const setUsuario = useCallback((u: Usuario) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUsuarioState(u)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password)
      tokenStorage.set(res.token)
      setUsuario(res.usuario)
      return res.usuario
    },
    [setUsuario],
  )

  // Un 401 en cualquier request (token vencido o cuenta deshabilitada) cierra la sesión.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Heartbeat: permite al admin ver quién está online (ventana de 5 min en el backend).
  useEffect(() => {
    if (!usuario) return
    const ping = () => authApi.heartbeat().catch(() => {})
    const id = setInterval(ping, HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [usuario])

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      isAuthenticated: usuario !== null,
      login,
      logout,
      setUsuario,
      hasRole: (...roles: RolNombre[]) => usuario !== null && roles.includes(usuario.rol),
    }),
    [usuario, login, logout, setUsuario],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
