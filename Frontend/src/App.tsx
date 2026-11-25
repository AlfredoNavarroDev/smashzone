import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import Layout from './components/Layout'
import SmashZone3D from './pages/client/SmashZone3D'
import DashboardNegocio from './pages/admin/DashboardNegocio'
import DashboardUsuarios from './pages/admin/DashboardUsuarios'
import AdminSesiones from './pages/admin/AdminSesiones'
import Perfil from './pages/perfil/Perfil'
import Login from './pages/auth/Login'
import Registro from './pages/auth/Registro'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* =================================================================
              EXPERIENCIA COMERCIAL 3D EXCLUSIVA PARA EL CLIENTE (PORTADA Y RESERVAS)
              ================================================================= */}
          <Route path="/" element={<SmashZone3D />} />

          {/* =================================================================
              ACCESO Y REGISTRO (CON HAMMERTEAR Y ESTÉTICA KELTIC)
              ================================================================= */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />

          {/* =================================================================
              CENTRO DE CONTROL ADMINISTRATIVO Y PERFILES (VISTA COMPLETA DEDICADA)
              ================================================================= */}
          <Route element={<Layout />}>
            <Route path="/admin" element={<DashboardNegocio />} />
            <Route path="/admin/usuarios" element={<DashboardUsuarios />} />
            <Route path="/admin/sesiones" element={<AdminSesiones />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>

          {/* REDIRECCIÓN POR DEFECTO */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
