import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth'
import { tokenStorage } from '../api/http'
import type { Usuario } from '../api/types'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

vi.mock('../api/auth')

const ana: Usuario = {
  id: '1', nombre: 'Ana', apellido: 'G', email: 'ana@x.com', telefono: null, documentoIdentidad: null,
  rol: 'Cliente', activo: true, fechaRegistro: null,
}

function Probe() {
  const { usuario, isAuthenticated, login, logout } = useAuth()
  return (
    <div>
      <p>{isAuthenticated ? `hola ${usuario?.nombre}` : 'anonimo'}</p>
      <button onClick={() => login('ana@x.com', 'Password1!')}>entrar</button>
      <button onClick={logout}>salir</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'tok', expiraEn: '', usuario: ana })
    vi.mocked(authApi.heartbeat).mockResolvedValue(undefined)
  })
  afterEach(() => vi.useRealTimers())

  it('login guarda token y usuario; logout los borra', async () => {
    const user = userEvent.setup()
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByText('anonimo')).toBeInTheDocument()

    await user.click(screen.getByText('entrar'))
    expect(await screen.findByText('hola Ana')).toBeInTheDocument()
    expect(tokenStorage.get()).toBe('tok')

    await user.click(screen.getByText('salir'))
    expect(screen.getByText('anonimo')).toBeInTheDocument()
    expect(tokenStorage.get()).toBeNull()
  })

  it('restaura la sesión guardada y envía heartbeat cada 60 s', async () => {
    tokenStorage.set('tok')
    localStorage.setItem('smashzone.usuario', JSON.stringify(ana))
    vi.useFakeTimers()

    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByText('hola Ana')).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(authApi.heartbeat).toHaveBeenCalledTimes(1)
  })
})
