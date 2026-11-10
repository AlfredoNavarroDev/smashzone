import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthProvider'
import DashboardUsuarios from './pages/admin/DashboardUsuarios'
import Login from './pages/auth/Login'
import Registro from './pages/auth/Registro'
import Home from './pages/Home'
import Perfil from './pages/perfil/Perfil'
import { RequireAuth, RequireRole } from './router/guards'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="perfil" element={<Perfil />} />
              <Route element={<RequireRole roles={['Admin']} />}>
                <Route path="admin/usuarios" element={<DashboardUsuarios />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
