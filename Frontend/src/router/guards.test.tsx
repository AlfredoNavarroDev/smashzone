import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { RolNombre, Usuario } from '../api/types'
import { AuthContext, type AuthContextValue } from '../context/authContext'
import { RequireAuth, RequireRole } from './guards'

function usuario(rol: RolNombre): Usuario {
  return { id: '1', nombre: 'Ana', apellido: 'G', email: 'a@x.com', telefono: null, documentoIdentidad: null, rol, activo: true, fechaRegistro: null }
}

function ctx(u: Usuario | null): AuthContextValue {
  return {
    usuario: u, isAuthenticated: u !== null, login: async () => u!, logout: () => {}, setUsuario: () => {},
    hasRole: (...roles) => u !== null && roles.includes(u.rol),
  }
}

function renderEn(path: string, u: Usuario | null) {
  return render(
    <AuthContext.Provider value={ctx(u)}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>pantalla login</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<p>inicio</p>} />
            <Route element={<RequireRole roles={['Admin']} />}>
              <Route path="/admin" element={<p>panel admin</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('guards de rutas', () => {
  it('redirige a /login si no hay sesión', () => {
    renderEn('/admin', null)
    expect(screen.getByText('pantalla login')).toBeInTheDocument()
  })

  it('un Cliente no accede a rutas Admin y vuelve al inicio', () => {
    renderEn('/admin', usuario('Cliente'))
    expect(screen.queryByText('panel admin')).not.toBeInTheDocument()
    expect(screen.getByText('inicio')).toBeInTheDocument()
  })

  it('un Admin accede al panel', () => {
    renderEn('/admin', usuario('Admin'))
    expect(screen.getByText('panel admin')).toBeInTheDocument()
  })
})
