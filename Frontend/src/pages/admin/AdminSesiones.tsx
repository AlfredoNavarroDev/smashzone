import React, { useEffect, useState } from 'react';
import { smashzoneApi } from '../../api/smashzoneApi';
import type { ReservaDetalleDTO, UsuarioDTO } from '../../types/api.types';
import { useAuth } from '../../context/useAuth';
import './DashboardNegocio.css';

export default function AdminSesiones() {
  const { usuario } = useAuth();
  const [reservas, setReservas] = useState<ReservaDetalleDTO[]>([]);
  const [cargando, setCargando] = useState(true);

  const token = localStorage.getItem('smashzone.token') || '';
  const currentUser: UsuarioDTO = usuario
    ? {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono ?? '',
        documentoIdentidad: usuario.documentoIdentidad ?? '',
        rol: usuario.rol,
        activo: usuario.activo,
        fechaRegistro: usuario.fechaRegistro ?? new Date().toISOString(),
      }
    : {
        id: 'usr-admin-demo',
        nombre: 'Admin',
        apellido: 'SmashZone',
        email: 'admin@smashzone.pe',
        telefono: '999999999',
        documentoIdentidad: '72345678',
        rol: 'Admin',
        activo: true,
        fechaRegistro: new Date().toISOString(),
      };

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await smashzoneApi.listarReservas(currentUser, undefined, token);
      setReservas(data);
    } catch {
      // fallback handled by smashzoneApi
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="negocio-mosaic" style={{ padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <span className="section-index-tag" style={{ color: 'var(--accent-volt)', letterSpacing: '0.12em', fontSize: '0.78rem' }}>
            // OPERACIONES DE PISTA & STAFF
          </span>
          <h1 style={{ margin: '0.3rem 0 0', fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#fff' }}>
            CONTROL DE BÓVEDAS EN VIVO
          </h1>
        </div>
        <button
          type="button"
          onClick={cargar}
          className="btn-keltic-outline"
          style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
        >
          {cargando ? 'Actualizando…' : 'Refrescar Sesiones'}
        </button>
      </div>

      <div className="keltic-table-wrap" style={{ background: 'rgba(15, 15, 18, 0.85)', border: '1px solid var(--border-hairline)', borderRadius: 4, padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <strong style={{ fontSize: '0.9rem', color: '#eee' }}>SESIONES ACTIVAS EN TIEMPO REAL</strong>
          <span className="keltic-badge badge-rage">{reservas.length} RESERVAS REGISTRADAS</span>
        </div>
        <table className="keltic-table">
          <thead>
            <tr>
              <th>Cliente & Contacto</th>
              <th>Cámara & Paquete</th>
              <th>Horario</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones de Operador</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong style={{ color: '#fff' }}>{r.nombreCliente}</strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    #{r.id.slice(0, 8)}
                  </div>
                </td>
                <td>
                  <strong>{r.nombreSala}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-volt)' }}>{r.nombrePaquete}</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  {new Date(r.fechaHoraInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-volt)', fontWeight: 700 }}>
                  S/ {r.montoTotal.toFixed(2)}
                </td>
                <td>
                  <span className="keltic-badge badge-volt">{r.estado}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {r.estado === 'Pendiente' && (
                      <button
                        type="button"
                        className="btn-keltic-primary"
                        style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                        onClick={async () => {
                          await smashzoneApi.procesarPago(
                            { idReserva: r.id, idMetodoPago: 3, exitoso: true },
                            currentUser,
                            token
                          );
                          await cargar();
                        }}
                      >
                        Cobrar Caja
                      </button>
                    )}
                    {r.estado === 'Confirmada' && (
                      <button
                        type="button"
                        className="btn-keltic-primary"
                        style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                        onClick={async () => {
                          await smashzoneApi.cambiarEstadoReserva(r.id, 'EnProceso', currentUser, token);
                          await cargar();
                        }}
                      >
                        Iniciar Sala
                      </button>
                    )}
                    {r.estado === 'EnProceso' && (
                      <button
                        type="button"
                        className="btn-keltic-primary"
                        style={{
                          padding: '0.3rem 0.7rem',
                          fontSize: '0.72rem',
                          background: 'var(--accent-volt)',
                          color: '#000',
                        }}
                        onClick={async () => {
                          await smashzoneApi.cambiarEstadoReserva(r.id, 'Completada', currentUser, token);
                          await cargar();
                        }}
                      >
                        Finalizar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
