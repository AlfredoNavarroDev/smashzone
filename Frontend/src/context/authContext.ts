import { createContext } from 'react'
import type { RolNombre, Usuario } from '../api/types'

export interface AuthContextValue {
  usuario: Usuario | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<Usuario>
  logout: () => void
  setUsuario: (u: Usuario) => void
  hasRole: (...roles: RolNombre[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
