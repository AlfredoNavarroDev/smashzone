import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../context/authContext'
import Login from './Login'

function ctx(login: AuthContextValue['login']): AuthContextValue {
  return { usuario: null, isAuthenticated: false, login, logout: () => {}, setUsuario: () => {}, hasRole: () => false }
}

function renderLogin(login: AuthContextValue['login']) {
  return render(
    <AuthContext.Provider value={ctx(login)}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<p>inicio</p>} />
          <Route path="/admin/usuarios" element={<p>panel admin</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const base = { id: '1', nombre: 'A', apellido: 'B', email: 'a@x.com', telefono: null, documentoIdentidad: null, activo: true, fechaRegistro: null }

describe('Login', () => {
  it('muestra el error cuando las credenciales son inválidas', async () => {
    const user = userEvent.setup()
    renderLogin(vi.fn().mockRejectedValue(new Error('Credenciales inválidas.')))

    await user.type(screen.getByLabelText('Email'), 'a@x.com')
    await user.type(screen.getByLabelText('Contraseña'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas.')
  })

  it('un Admin va al panel de usuarios', async () => {
    const user = userEvent.setup()
    renderLogin(vi.fn().mockResolvedValue({ ...base, rol: 'Admin' }))

    await user.type(screen.getByLabelText('Email'), 'a@x.com')
    await user.type(screen.getByLabelText('Contraseña'), 'Password1!')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('panel admin')).toBeInTheDocument()
  })

  it('un Cliente va al inicio', async () => {
    const user = userEvent.setup()
    renderLogin(vi.fn().mockResolvedValue({ ...base, rol: 'Cliente' }))

    await user.type(screen.getByLabelText('Email'), 'a@x.com')
    await user.type(screen.getByLabelText('Contraseña'), 'Password1!')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('inicio')).toBeInTheDocument()
  })
})
