import {
  ActualizarItemExtraDTO,
  ActualizarPaqueteDTO,
  ActualizarPerfilDTO,
  ActualizarSalaDTO,
  AdminUsuarioDTO,
  CambiarPasswordDTO,
  CrearItemExtraDTO,
  CrearPagoDTO,
  CrearPaqueteDTO,
  CrearReservaDTO,
  CrearSalaDTO,
  EstadoReservaNombre,
  HistorialEstadoDTO,
  HoraPicoDTO,
  IngresoMesDTO,
  ItemExtraDTO,
  LoginDTO,
  LoginRespuestaDTO,
  PaginadoDTO,
  PaqueteDTO,
  PaqueteDemandaDTO,
  RegistroDTO,
  ReservaDetalleDTO,
  RolDTO,
  RolNombre,
  SalaDTO,
  UsuarioDTO,
  UsuariosResumenDTO,
  VoucherDTO,
} from '../types/api.types';

// ============================================================================
// ERROR DE DOMINIO FRONTEND (Espejo de ProblemDetails / ValidationProblemDetails)
// ============================================================================
export class ApiDomainError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiDomainError';
    this.status = status;
    this.errors = errors;
  }
}

// ============================================================================
// BASE DE DATOS TRANSACCIONAL EN MEMORIA / LOCALSTORAGE (MODO PRÁCTICA KELTIC)
// ============================================================================
const STORAGE_KEY = 'smashzone_keltic_db_v2';

interface MockPaymentRecord {
  idPago: string;
  idReserva: string;
  monto: number;
  metodoPago: string;
  transaccionRef: string;
  fechaPago: string;
  exitoso: boolean;
}

interface MockDatabase {
  usuarios: (AdminUsuarioDTO & { passwordHash: string })[];
  salas: SalaDTO[];
  paquetes: PaqueteDTO[];
  inventario: ItemExtraDTO[];
  reservas: ReservaDetalleDTO[];
  historiales: Record<string, HistorialEstadoDTO[]>;
  pagos: MockPaymentRecord[];
}

const nowIso = () => new Date().toISOString();

function createInitialDb(): MockDatabase {
  const tomorrow18 = new Date();
  tomorrow18.setUTCDate(tomorrow18.getUTCDate() + 1);
  tomorrow18.setUTCHours(18, 0, 0, 0);
  const tomorrow18End = new Date(tomorrow18.getTime() + 45 * 60000);

  const tomorrow20 = new Date();
  tomorrow20.setUTCDate(tomorrow20.getUTCDate() + 1);
  tomorrow20.setUTCHours(20, 0, 0, 0);
  const tomorrow20End = new Date(tomorrow20.getTime() + 60 * 60000);

  const res1Id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const res2Id = '1c8e9a22-7f4e-4a11-8c3a-5f9d6b2a1e09';

  return {
    usuarios: [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        nombre: 'Valeria',
        apellido: 'Keltic (Admin)',
        email: 'admin@smashzone.pe',
        telefono: '999111222',
        documentoIdentidad: '72819201',
        rol: 'Admin',
        activo: true,
        online: true,
        fechaRegistro: '2026-09-01T12:00:00Z',
        ultimoAcceso: nowIso(),
        ultimaActividad: nowIso(),
        passwordHash: 'Admin123!',
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        nombre: 'Marco',
        apellido: 'Vargas (Instructor)',
        email: 'staff@smashzone.pe',
        telefono: '988777666',
        documentoIdentidad: '45918273',
        rol: 'Staff',
        activo: true,
        online: true,
        fechaRegistro: '2026-09-10T15:30:00Z',
        ultimoAcceso: nowIso(),
        ultimaActividad: nowIso(),
        passwordHash: 'Staff123!',
      },
      {
        id: 'c0000000-0000-0000-0000-000000000003',
        nombre: 'Ana',
        apellido: 'García',
        email: 'ana@correo.com',
        telefono: '999888777',
        documentoIdentidad: '70192834',
        rol: 'Cliente',
        activo: true,
        online: true,
        fechaRegistro: '2026-10-05T18:20:00Z',
        ultimoAcceso: nowIso(),
        ultimaActividad: nowIso(),
        passwordHash: 'Password1!',
      },
      {
        id: 'd0000000-0000-0000-0000-000000000004',
        nombre: 'Diego',
        apellido: 'Mendoza',
        email: 'diego@correo.com',
        telefono: '944555333',
        documentoIdentidad: '71829304',
        rol: 'Cliente',
        activo: false,
        online: false,
        fechaRegistro: '2026-10-18T10:00:00Z',
        ultimoAcceso: '2026-10-25T19:00:00Z',
        ultimaActividad: '2026-10-25T19:25:00Z',
        passwordHash: 'Password1!',
      },
    ],
    salas: [
      {
        id: 1,
        nombre: 'CÁMARA 01 // BÚNKER NUCLEAR',
        capacidadMaxima: 4,
        descripcion:
          'Bóveda acorazada con paredes de hormigón armado de 40cm, iluminación estroboscópica carmesí y sistema de audio subwoofer de 2000W.',
        activa: true,
      },
      {
        id: 2,
        nombre: 'CÁMARA 02 // OFICINA CORPORATIVA',
        capacidadMaxima: 6,
        descripcion:
          'Escenario hiperrealista de cubículos de oficina con escritorios metálicos, impresoras multifuncionales y monitores listos para el bate de acero.',
        activa: true,
      },
      {
        id: 3,
        nombre: 'CÁMARA 03 // LABORATORIO CAOS XL',
        capacidadMaxima: 8,
        descripcion:
          'Arena industrial de doble altura para escuadrones. Equipada con jaula de impacto pesado, barras hidráulicas y zona de demolición libre.',
        activa: true,
      },
      {
        id: 4,
        nombre: 'CÁMARA 04 // SECTOR CRIOGÉNICO',
        capacidadMaxima: 2,
        descripcion:
          'Cámara táctica en calibración acústica y recambio de blindaje de policarbonato.',
        activa: false,
      },
    ],
    paquetes: [
      {
        id: 1,
        nombre: 'RAGE STARTER // SPARK',
        descripcion:
          'Descarga táctica individual o en dupla. Incluye 15 botellas de cristal templado, 4 piezas de cerámica y 1 periférico electrónico con mazo ligero.',
        precio: 89.0,
        duracionMinutos: 30,
        maxParticipantes: 2,
        cantidadItemsEstandar: 20,
        activo: true,
      },
      {
        id: 2,
        nombre: 'COUPLES & DUO // THERAPY',
        descripcion:
          'El protocolo más reservado. 25 botellas de vidrio, 8 platos industriales, 1 impresora de oficina y 1 monitor LCD con bates de aluminio y barretas.',
        precio: 159.0,
        duracionMinutos: 45,
        maxParticipantes: 4,
        cantidadItemsEstandar: 35,
        activo: true,
      },
      {
        id: 3,
        nombre: 'EXECUTIVE MELTDOWN // VIP',
        descripcion:
          'Demolición ejecutiva sin restricciones: 40 piezas de cristal, 2 impresoras corporativas, 1 TV CRT/LED y 1 microondas con mazo de demolición de 5kg.',
        precio: 249.0,
        duracionMinutos: 60,
        maxParticipantes: 6,
        cantidadItemsEstandar: 55,
        activo: true,
      },
      {
        id: 4,
        nombre: 'TOTAL ANNIHILATION // SQUAD',
        descripcion:
          'Aniquilación total para grupos. 75 objetos de vidrio/cerámica, 3 electrodomésticos medianos, 2 monitores y playlist conectada al sistema estroboscópico.',
        precio: 369.0,
        duracionMinutos: 60,
        maxParticipantes: 8,
        cantidadItemsEstandar: 85,
        activo: true,
      },
    ],
    inventario: [
      {
        id: 1,
        nombre: 'Botellas de Cristal Templado (x12)',
        categoria: 'Vidrio',
        precioUnitario: 25.0,
        stockDisponible: 34,
        activo: true,
      },
      {
        id: 2,
        nombre: 'Tazas y Vajilla de Cerámica (x10)',
        categoria: 'Vidrio',
        precioUnitario: 28.0,
        stockDisponible: 22,
        activo: true,
      },
      {
        id: 3,
        nombre: 'Six-Pack de Botellas Duff',
        categoria: 'Vidrio',
        precioUnitario: 35.0,
        stockDisponible: 18,
        activo: true,
      },
      {
        id: 4,
        nombre: 'Impresora Corporativa Multifuncional',
        categoria: 'Electrónica',
        precioUnitario: 55.0,
        stockDisponible: 9,
        activo: true,
      },
      {
        id: 5,
        nombre: 'Monitor CRT de Oficina',
        categoria: 'Electrónica',
        precioUnitario: 65.0,
        stockDisponible: 8,
        activo: true,
      },
      {
        id: 6,
        nombre: 'Televisor Retro 32" de Cristal',
        categoria: 'Electrónica',
        precioUnitario: 75.0,
        stockDisponible: 6,
        activo: true,
      },
      {
        id: 7,
        nombre: 'Lavadora Industrial en Desuso (Boss Item)',
        categoria: 'Electrodomésticos',
        precioUnitario: 120.0,
        stockDisponible: 4,
        activo: true,
      },
    ],
    reservas: [
      {
        id: res1Id,
        idCliente: 'c0000000-0000-0000-0000-000000000003',
        nombreCliente: 'Ana García',
        idSala: 1,
        nombreSala: 'CÁMARA 01 // BÚNKER NUCLEAR',
        idPaquete: 2,
        nombrePaquete: 'COUPLES & DUO // THERAPY',
        fechaHoraInicio: tomorrow18.toISOString(),
        fechaHoraFin: tomorrow18End.toISOString(),
        numParticipantes: 2,
        estado: 'Confirmada',
        montoPaquete: 159.0,
        montoExtras: 55.0,
        montoTotal: 214.0,
        notasEspeciales: 'Playlist Industrial Techno / Heavy Metal activada.',
        fechaCreacion: '2026-11-10T14:20:00Z',
        extras: [
          {
            idItemExtra: 3,
            nombreItem: 'Impresora Corporativa Multifuncional',
            categoria: 'Electrónica',
            cantidad: 1,
            precioUnitarioHistorico: 55.0,
            subtotal: 55.0,
          },
        ],
      },
      {
        id: res2Id,
        idCliente: 'c0000000-0000-0000-0000-000000000003',
        nombreCliente: 'Ana García',
        idSala: 2,
        nombreSala: 'CÁMARA 02 // OFICINA CORPORATIVA',
        idPaquete: 3,
        nombrePaquete: 'EXECUTIVE MELTDOWN // VIP',
        fechaHoraInicio: tomorrow20.toISOString(),
        fechaHoraFin: tomorrow20End.toISOString(),
        numParticipantes: 4,
        estado: 'Pendiente',
        montoPaquete: 249.0,
        montoExtras: 50.0,
        montoTotal: 299.0,
        notasEspeciales: 'Celebración post-exámenes parciales.',
        fechaCreacion: '2026-11-11T19:10:00Z',
        extras: [
          {
            idItemExtra: 1,
            nombreItem: 'Caja x12 Botellas de Cristal Templado',
            categoria: 'Vidrio',
            cantidad: 2,
            precioUnitarioHistorico: 25.0,
            subtotal: 50.0,
          },
        ],
      },
    ],
    historiales: {
      [res1Id]: [
        {
          id: 1,
          estadoAnterior: null,
          estadoNuevo: 'Pendiente',
          idUsuarioCambio: null,
          nombreUsuarioCambio: 'Cliente (Creación Inicial)',
          fechaCambio: '2026-11-10T14:20:00Z',
        },
        {
          id: 2,
          estadoAnterior: 'Pendiente',
          estadoNuevo: 'Confirmada',
          idUsuarioCambio: null,
          nombreUsuarioCambio: 'Pasarela Culqi (Pago Exitoso)',
          fechaCambio: '2026-11-10T14:22:15Z',
        },
      ],
      [res2Id]: [
        {
          id: 3,
          estadoAnterior: null,
          estadoNuevo: 'Pendiente',
          idUsuarioCambio: null,
          nombreUsuarioCambio: 'Cliente (Creación Inicial)',
          fechaCambio: '2026-11-11T19:10:00Z',
        },
      ],
    },
    pagos: [
      {
        idPago: 'pay-901',
        idReserva: 'hist-01',
        monto: 3450.0,
        metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
        transaccionRef: 'CULQI-202608-01',
        fechaPago: '2026-08-18T19:00:00Z',
        exitoso: true,
      },
      {
        idPago: 'pay-902',
        idReserva: 'hist-02',
        monto: 4890.0,
        metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
        transaccionRef: 'CULQI-202609-04',
        fechaPago: '2026-09-22T20:00:00Z',
        exitoso: true,
      },
      {
        idPago: 'pay-903',
        idReserva: 'hist-03',
        monto: 6120.0,
        metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
        transaccionRef: 'CULQI-202610-09',
        fechaPago: '2026-10-19T21:00:00Z',
        exitoso: true,
      },
      {
        idPago: 'pay-904',
        idReserva: res1Id,
        monto: 214.0,
        metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
        transaccionRef: 'CULQI-77829104',
        fechaPago: '2026-11-10T14:22:15Z',
        exitoso: true,
      },
    ],
  };
}

function loadDb(): MockDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDb();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as MockDatabase;
  } catch {
    return createInitialDb();
  }
}

function saveDb(db: MockDatabase) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore storage quota errors
  }
}

export function resetMockDatabase(): MockDatabase {
  const initial = createInitialDb();
  saveDb(initial);
  return initial;
}

// ============================================================================
// CLIENTE API HÍBRIDO (CONECTA A .NET 10 O EJECUTA MOTOR LOCAL CON REGLAS 1:1)
// ============================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5021/api';

let isBackendLive = false;

export function getEngineMode(): 'LIVE_API' | 'SIMULATION_ENGINE' {
  return isBackendLive ? 'LIVE_API' : 'SIMULATION_ENGINE';
}

async function tryFetchLive<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<{ handled: true; data: T } | { handled: false }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    isBackendLive = true;

    if (res.status === 204) {
      return { handled: true, data: undefined as unknown as T };
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      let msg =
        body?.detail ||
        body?.title ||
        (body?.errors ? Object.values(body.errors).flat().join(' ') : null) ||
        `No fue posible completar la operación (${res.status}).`;
      // Limpiar prefijos técnicos que provengan de excepciones del backend
      msg = msg.replace(
        /^\d{3}\s*(Conflict|ConflictoException|ReglaNegocioException|BadRequest|NotFound|NoEncontradoException):\s*/i,
        ''
      );
      throw new ApiDomainError(res.status, msg, body?.errors);
    }

    return { handled: true, data: body as T };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof ApiDomainError) {
      throw err;
    }
    // Red caída o backend local apagado -> activamos Motor Transaccional Simulado
    isBackendLive = false;
    return { handled: false };
  }
}

// Validación de contraseña idéntica a PasswordRules.PasswordSegura en Backend
export function validarPasswordSegura(password: string): string | null {
  if (!password || password.length < 8 || password.length > 100) {
    return 'La contraseña debe tener entre 8 y 100 caracteres.';
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'La contraseña debe incluir al menos una minúscula, una mayúscula y un número.';
  }
  return null;
}

export const smashzoneApi = {
  // --------------------------------------------------------------------------
  // BLOQUE 1 — AUTH Y USUARIOS
  // --------------------------------------------------------------------------
  async login(dto: LoginDTO): Promise<LoginRespuestaDTO> {
    const live = await tryFetchLive<LoginRespuestaDTO>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    if (live.handled) return live.data;

    const db = loadDb();
    const emailNorm = dto.email.trim().toLowerCase();
    const user = db.usuarios.find((u) => u.email.toLowerCase() === emailNorm);

    if (!user || user.passwordHash !== dto.password) {
      throw new ApiDomainError(401, 'Credenciales inválidas.');
    }
    if (!user.activo) {
      throw new ApiDomainError(
        401,
        'La cuenta está deshabilitada. Contacta al administrador.'
      );
    }

    user.ultimoAcceso = nowIso();
    user.ultimaActividad = nowIso();
    user.online = true;
    saveDb(db);

    const expiraEn = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { passwordHash: _, online: __, ultimoAcceso: ___, ultimaActividad: ____, ...usuarioDto } = user;

    return {
      token: `jwt-keltic-sim-${user.id}`,
      expiraEn,
      usuario: usuarioDto,
    };
  },

  async registro(dto: RegistroDTO): Promise<UsuarioDTO> {
    const live = await tryFetchLive<UsuarioDTO>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    if (live.handled) return live.data;

    const errors: Record<string, string[]> = {};
    if (!dto.nombre.trim()) errors.Nombre = ['El nombre es obligatorio.'];
    if (!dto.apellido.trim()) errors.Apellido = ['El apellido es obligatorio.'];
    if (!dto.email.trim() || !dto.email.includes('@'))
      errors.Email = ['El formato de email no es válido.'];
    const passErr = validarPasswordSegura(dto.password);
    if (passErr) errors.Password = [passErr];

    if (Object.keys(errors).length > 0) {
      throw new ApiDomainError(400, 'Error de validación en los campos enviados.', errors);
    }

    const db = loadDb();
    const emailNorm = dto.email.trim().toLowerCase();
    if (db.usuarios.some((u) => u.email.toLowerCase() === emailNorm)) {
      throw new ApiDomainError(409, 'Ya existe un usuario registrado con ese correo electrónico.');
    }

    const nuevo: AdminUsuarioDTO & { passwordHash: string } = {
      id: crypto.randomUUID(),
      nombre: dto.nombre.trim(),
      apellido: dto.apellido.trim(),
      email: emailNorm,
      telefono: dto.telefono?.trim() || null,
      documentoIdentidad: dto.documentoIdentidad?.trim() || null,
      rol: 'Cliente',
      activo: true,
      online: true,
      fechaRegistro: nowIso(),
      ultimoAcceso: nowIso(),
      ultimaActividad: nowIso(),
      passwordHash: dto.password,
    };

    db.usuarios.push(nuevo);
    saveDb(db);

    const { passwordHash: _, online: __, ultimoAcceso: ___, ultimaActividad: ____, ...usuarioDto } = nuevo;
    return usuarioDto;
  },

  async heartbeat(token: string, currentUserId: string): Promise<void> {
    const live = await tryFetchLive<void>('/auth/heartbeat', { method: 'POST' }, token);
    if (live.handled) return;

    const db = loadDb();
    const user = db.usuarios.find((u) => u.id === currentUserId);
    if (!user || !user.activo) {
      throw new ApiDomainError(401, 'Sesión invalidada: la cuenta fue deshabilitada.');
    }
    user.ultimaActividad = nowIso();
    user.online = true;
    saveDb(db);
  },

  async actualizarPerfil(
    dto: ActualizarPerfilDTO,
    token: string,
    currentUserId: string
  ): Promise<UsuarioDTO> {
    const live = await tryFetchLive<UsuarioDTO>(
      '/usuarios/me',
      { method: 'PUT', body: JSON.stringify(dto) },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    const user = db.usuarios.find((u) => u.id === currentUserId);
    if (!user) throw new ApiDomainError(404, 'Usuario no encontrado.');
    user.nombre = dto.nombre.trim();
    user.apellido = dto.apellido.trim();
    user.telefono = dto.telefono?.trim() || null;
    saveDb(db);

    const { passwordHash: _, online: __, ultimoAcceso: ___, ultimaActividad: ____, ...usuarioDto } = user;
    return usuarioDto;
  },

  async cambiarPassword(
    dto: CambiarPasswordDTO,
    token: string,
    currentUserId: string
  ): Promise<void> {
    const live = await tryFetchLive<void>(
      '/usuarios/me/password',
      { method: 'PUT', body: JSON.stringify(dto) },
      token
    );
    if (live.handled) return;

    const passErr = validarPasswordSegura(dto.passwordNueva);
    if (passErr) throw new ApiDomainError(400, passErr, { PasswordNueva: [passErr] });

    const db = loadDb();
    const user = db.usuarios.find((u) => u.id === currentUserId);
    if (!user) throw new ApiDomainError(404, 'Usuario no encontrado.');
    if (user.passwordHash !== dto.passwordActual) {
      throw new ApiDomainError(400, 'La contraseña actual es incorrecta.');
    }
    user.passwordHash = dto.passwordNueva;
    saveDb(db);
  },

  // --------------------------------------------------------------------------
  // BLOQUE 1 (ADMIN) — GESTIÓN DE USUARIOS
  // --------------------------------------------------------------------------
  async listarUsuariosAdmin(
    filtros: {
      texto?: string;
      rol?: RolNombre | '';
      activo?: boolean | '';
      online?: boolean | '';
      pagina?: number;
      tamanoPagina?: number;
    },
    token?: string | null
  ): Promise<PaginadoDTO<AdminUsuarioDTO>> {
    const live = await tryFetchLive<PaginadoDTO<AdminUsuarioDTO>>(
      `/admin/usuarios?pagina=${filtros.pagina || 1}&tamanoPagina=${filtros.tamanoPagina || 20}`,
      { method: 'GET' },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    let items = db.usuarios.map(({ passwordHash: _, ...rest }) => rest);

    if (filtros.texto?.trim()) {
      const q = filtros.texto.trim().toLowerCase();
      items = items.filter(
        (u) =>
          u.nombre.toLowerCase().includes(q) ||
          u.apellido.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    if (filtros.rol) {
      items = items.filter((u) => u.rol === filtros.rol);
    }
    if (typeof filtros.activo === 'boolean') {
      items = items.filter((u) => u.activo === filtros.activo);
    }
    if (typeof filtros.online === 'boolean') {
      items = items.filter((u) => u.online === filtros.online);
    }

    return {
      items,
      total: items.length,
      pagina: filtros.pagina || 1,
      tamanoPagina: filtros.tamanoPagina || 20,
    };
  },

  async obtenerResumenUsuariosAdmin(token?: string | null): Promise<UsuariosResumenDTO> {
    const live = await tryFetchLive<UsuariosResumenDTO>(
      '/admin/usuarios/resumen',
      { method: 'GET' },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    const totalRegistrados = db.usuarios.length;
    const habilitados = db.usuarios.filter((u) => u.activo).length;
    const deshabilitados = totalRegistrados - habilitados;
    const onlineAhora = db.usuarios.filter((u) => u.activo && u.online).length;
    const activos7Dias = habilitados;

    const roles: RolNombre[] = ['Admin', 'Staff', 'Cliente'];
    const porRol = roles.map((rol) => ({
      rol,
      cantidad: db.usuarios.filter((u) => u.rol === rol).length,
    }));

    return {
      totalRegistrados,
      habilitados,
      deshabilitados,
      onlineAhora,
      activos7Dias,
      porRol,
      registrosPorDia: [
        { fecha: '2026-11-08', cantidad: 1 },
        { fecha: '2026-11-09', cantidad: 2 },
        { fecha: '2026-11-10', cantidad: 1 },
        { fecha: '2026-11-11', cantidad: 3 },
        { fecha: '2026-11-12', cantidad: 2 },
      ],
    };
  },

  async cambiarRolUsuarioAdmin(
    idUsuario: string,
    nuevoRol: RolNombre,
    actorId: string,
    token?: string | null
  ): Promise<void> {
    const idRolMap: Record<RolNombre, number> = { Admin: 1, Staff: 2, Cliente: 3 };
    const live = await tryFetchLive<void>(
      `/admin/usuarios/${idUsuario}/rol`,
      { method: 'PUT', body: JSON.stringify({ idRol: idRolMap[nuevoRol] }) },
      token
    );
    if (live.handled) return;

    const db = loadDb();
    if (idUsuario === actorId && nuevoRol !== 'Admin') {
      throw new ApiDomainError(
        400,
        'Un administrador no puede quitarse su propio rol de Administrador.'
      );
    }

    const user = db.usuarios.find((u) => u.id === idUsuario);
    if (!user) throw new ApiDomainError(404, 'Usuario no encontrado.');

    const adminsActivos = db.usuarios.filter((u) => u.rol === 'Admin' && u.activo);
    if (user.rol === 'Admin' && nuevoRol !== 'Admin' && adminsActivos.length <= 1) {
      throw new ApiDomainError(
        400,
        'Siempre debe quedar al menos un administrador activo en el sistema.'
      );
    }

    user.rol = nuevoRol;
    saveDb(db);
  },

  async cambiarEstadoUsuarioAdmin(
    idUsuario: string,
    activo: boolean,
    actorId: string,
    token?: string | null
  ): Promise<void> {
    const live = await tryFetchLive<void>(
      `/admin/usuarios/${idUsuario}/estado`,
      { method: 'PUT', body: JSON.stringify({ activo }) },
      token
    );
    if (live.handled) return;

    const db = loadDb();
    if (idUsuario === actorId && !activo) {
      throw new ApiDomainError(
        400,
        'Un administrador no puede deshabilitar su propia cuenta.'
      );
    }

    const user = db.usuarios.find((u) => u.id === idUsuario);
    if (!user) throw new ApiDomainError(404, 'Usuario no encontrado.');

    user.activo = activo;
    if (!activo) user.online = false;
    saveDb(db);
  },

  async listarRolesAdmin(): Promise<RolDTO[]> {
    return [
      { id: 1, nombre: 'Admin', descripcion: 'Control total del sistema, catálogo y reportes' },
      { id: 2, nombre: 'Staff', descripcion: 'Operación de salas, check-in y pagos manuales' },
      { id: 3, nombre: 'Cliente', descripcion: 'Reserva de cámaras de destrucción y pagos online' },
    ];
  },

  // --------------------------------------------------------------------------
  // BLOQUE 2 — CATÁLOGO (SALAS, PAQUETES, INVENTARIO)
  // --------------------------------------------------------------------------
  async listarSalas(soloActivas?: boolean): Promise<SalaDTO[]> {
    const query = typeof soloActivas === 'boolean' ? `?activa=${soloActivas}` : '';
    const live = await tryFetchLive<SalaDTO[]>(`/salas${query}`);
    if (live.handled) return live.data;

    const db = loadDb();
    return typeof soloActivas === 'boolean'
      ? db.salas.filter((s) => s.activa === soloActivas)
      : db.salas;
  },

  async crearSala(dto: CrearSalaDTO, token?: string | null): Promise<SalaDTO> {
    const live = await tryFetchLive<SalaDTO>(
      '/salas',
      { method: 'POST', body: JSON.stringify(dto) },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    if (db.salas.some((s) => s.nombre.toLowerCase() === dto.nombre.trim().toLowerCase())) {
      throw new ApiDomainError(409, '409 Conflict: Ya existe una sala con ese nombre.');
      throw new ApiDomainError(409, 'Ya existe una sala con ese nombre.');
    }
    const nueva: SalaDTO = {
      id: Math.max(0, ...db.salas.map((s) => s.id)) + 1,
      nombre: dto.nombre.trim(),
      capacidadMaxima: Number(dto.capacidadMaxima),
      descripcion: dto.descripcion?.trim() || null,
      activa: true,
    };
    db.salas.push(nueva);
    saveDb(db);
    return nueva;
  },

  async actualizarSala(
    id: number,
    dto: ActualizarSalaDTO,
    token?: string | null
  ): Promise<SalaDTO> {
    const live = await tryFetchLive<SalaDTO>(
      `/salas/${id}`,
      { method: 'PUT', body: JSON.stringify(dto) },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    const sala = db.salas.find((s) => s.id === id);
    if (!sala) throw new ApiDomainError(404, 'Sala no encontrada.');
    if (
      db.salas.some(
        (s) => s.id !== id && s.nombre.toLowerCase() === dto.nombre.trim().toLowerCase()
      )
    ) {
      throw new ApiDomainError(409, '409 Conflict: Ya existe otra sala con ese nombre.');
      throw new ApiDomainError(409, 'Ya existe otra sala con ese nombre.');
    }
    sala.nombre = dto.nombre.trim();
    sala.capacidadMaxima = Number(dto.capacidadMaxima);
    sala.descripcion = dto.descripcion?.trim() || null;
    saveDb(db);
    return sala;
  },

  async cambiarEstadoSala(id: number, activo: boolean, token?: string | null): Promise<void> {
    const live = await tryFetchLive<void>(
      `/salas/${id}/estado`,
      { method: 'PUT', body: JSON.stringify({ activo }) },
      token
    );
    if (live.handled) return;

    const db = loadDb();
    const sala = db.salas.find((s) => s.id === id);
    if (!sala) throw new ApiDomainError(404, 'Sala no encontrada.');
    sala.activa = activo;
    saveDb(db);
  },

  async listarPaquetes(soloActivos?: boolean): Promise<PaqueteDTO[]> {
    const query = typeof soloActivos === 'boolean' ? `?activo=${soloActivos}` : '';
    const live = await tryFetchLive<PaqueteDTO[]>(`/paquetes${query}`);
    if (live.handled) return live.data;

    const db = loadDb();
    return typeof soloActivos === 'boolean'
      ? db.paquetes.filter((p) => p.activo === soloActivos)
      : db.paquetes;
  },

  async crearPaquete(dto: CrearPaqueteDTO, token?: string | null): Promise<PaqueteDTO> {
    const live = await tryFetchLive<PaqueteDTO>(
      '/paquetes',
      { method: 'POST', body: JSON.stringify(dto) },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    if (db.paquetes.some((p) => p.nombre.toLowerCase() === dto.nombre.trim().toLowerCase())) {
      throw new ApiDomainError(409, '409 Conflict: Ya existe un paquete con ese nombre.');
      throw new ApiDomainError(409, 'Ya existe un paquete con ese nombre.');
    }
    const nuevo: PaqueteDTO = {
      id: Math.max(0, ...db.paquetes.map((p) => p.id)) + 1,
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion?.trim() || null,
      precio: Number(dto.precio),
      duracionMinutos: Number(dto.duracionMinutos),
      maxParticipantes: Number(dto.maxParticipantes),
      cantidadItemsEstandar: Number(dto.cantidadItemsEstandar),
      activo: true,
    };
    db.paquetes.push(nuevo);
    saveDb(db);
    return nuevo;
  },

  async cambiarEstadoPaquete(id: number, activo: boolean, token?: string | null): Promise<void> {
    const live = await tryFetchLive<void>(
      `/paquetes/${id}/estado`,
      { method: 'PUT', body: JSON.stringify({ activo }) },
      token
    );
    if (live.handled) return;

    const db = loadDb();
    const paq = db.paquetes.find((p) => p.id === id);
    if (!paq) throw new ApiDomainError(404, 'Paquete no encontrado.');
    paq.activo = activo;
    saveDb(db);
  },

  async listarInventario(filtros?: {
    categoria?: string;
    activo?: boolean;
  }): Promise<ItemExtraDTO[]> {
    const params = new URLSearchParams();
    if (filtros?.categoria && filtros.categoria !== 'Todos')
      params.set('categoria', filtros.categoria);
    if (typeof filtros?.activo === 'boolean') params.set('activo', String(filtros.activo));
    const qs = params.toString() ? `?${params.toString()}` : '';

    const live = await tryFetchLive<ItemExtraDTO[]>(`/inventario${qs}`);
    if (live.handled) return live.data;

    const db = loadDb();
    return db.inventario.filter((item) => {
      if (
        filtros?.categoria &&
        filtros.categoria !== 'Todos' &&
        item.categoria !== filtros.categoria
      ) {
        return false;
      }
      if (typeof filtros?.activo === 'boolean' && item.activo !== filtros.activo) {
        return false;
      }
      return true;
    });
  },

  async crearItemInventario(
    dto: CrearItemExtraDTO,
    token?: string | null
  ): Promise<ItemExtraDTO> {
    const live = await tryFetchLive<ItemExtraDTO>(
      '/inventario',
      { method: 'POST', body: JSON.stringify(dto) },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    if (db.inventario.some((i) => i.nombre.toLowerCase() === dto.nombre.trim().toLowerCase())) {
      throw new ApiDomainError(409, '409 Conflict: Ya existe un ítem en inventario con ese nombre.');
      throw new ApiDomainError(409, 'Ya existe un ítem en inventario con ese nombre.');
    }
    const nuevo: ItemExtraDTO = {
      id: Math.max(0, ...db.inventario.map((i) => i.id)) + 1,
      nombre: dto.nombre.trim(),
      categoria: dto.categoria,
      precioUnitario: Number(dto.precioUnitario),
      stockDisponible: Number(dto.stockDisponible),
      activo: true,
    };
    db.inventario.push(nuevo);
    saveDb(db);
    return nuevo;
  },

  async actualizarItemInventario(
    id: number,
    dto: ActualizarItemExtraDTO,
    token?: string | null
  ): Promise<ItemExtraDTO> {
    const live = await tryFetchLive<ItemExtraDTO>(
      `/inventario/${id}`,
      { method: 'PUT', body: JSON.stringify(dto) },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    const item = db.inventario.find((i) => i.id === id);
    if (!item) throw new ApiDomainError(404, 'Ítem no encontrado.');
    item.nombre = dto.nombre.trim();
    item.categoria = dto.categoria;
    item.precioUnitario = Number(dto.precioUnitario);
    item.stockDisponible = Number(dto.stockDisponible);
    saveDb(db);
    return item;
  },

  async cambiarEstadoInventario(
    id: number,
    activo: boolean,
    token?: string | null
  ): Promise<void> {
    const live = await tryFetchLive<void>(
      `/inventario/${id}/estado`,
      { method: 'PUT', body: JSON.stringify({ activo }) },
      token
    );
    if (live.handled) return;

    const db = loadDb();
    const item = db.inventario.find((i) => i.id === id);
    if (!item) throw new ApiDomainError(404, 'Ítem no encontrado.');
    item.activo = activo;
    saveDb(db);
  },

  // --------------------------------------------------------------------------
  // BLOQUE 3 — RESERVAS Y PAGOS (REGLAS EXACTAS DE ReservaService & PagoService)
  // --------------------------------------------------------------------------
  async listarReservas(
    actor: UsuarioDTO,
    estadoFiltro?: EstadoReservaNombre | '',
    token?: string | null
  ): Promise<ReservaDetalleDTO[]> {
    const qs = estadoFiltro ? `?estado=${estadoFiltro}` : '';
    const live = await tryFetchLive<ReservaDetalleDTO[]>(`/reservas${qs}`, { method: 'GET' }, token);
    if (live.handled) return live.data;

    const db = loadDb();
    let list = [...db.reservas].sort(
      (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
    );

    if (actor.rol === 'Cliente') {
      list = list.filter((r) => r.idCliente === actor.id);
    }
    if (estadoFiltro) {
      list = list.filter((r) => r.estado === estadoFiltro);
    }
    return list;
  },

  async crearReserva(
    dto: CrearReservaDTO,
    actor: UsuarioDTO,
    token?: string | null
  ): Promise<ReservaDetalleDTO> {
    const live = await tryFetchLive<ReservaDetalleDTO>(
      '/reservas',
      { method: 'POST', body: JSON.stringify(dto) },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();

    // 1. Resolver cliente dueño (Si es Cliente, se ignora dto.idCliente)
    let idDueno = actor.id;
    let nombreDueno = `${actor.nombre} ${actor.apellido}`;
    if ((actor.rol === 'Staff' || actor.rol === 'Admin') && dto.idCliente) {
      const clienteTarget = db.usuarios.find((u) => u.id === dto.idCliente);
      if (!clienteTarget) {
        throw new ApiDomainError(404, 'El cliente indicado no existe.');
      }
      idDueno = clienteTarget.id;
      nombreDueno = `${clienteTarget.nombre} ${clienteTarget.apellido}`;
    }

    // 2. Validar Sala (404 si no existe, 400 si inactiva)
    const sala = db.salas.find((s) => s.id === dto.idSala);
    if (!sala) throw new ApiDomainError(404, 'La sala seleccionada no existe.');
    if (!sala.activa)
      throw new ApiDomainError(
        400,
        'La sala seleccionada se encuentra en mantenimiento (inactiva).'
      );

    // 3. Validar Paquete (404 si no existe, 400 si inactivo)
    const paquete = db.paquetes.find((p) => p.id === dto.idPaquete);
    if (!paquete)
      throw new ApiDomainError(404, 'El paquete seleccionado no existe.');
    if (!paquete.activo)
      throw new ApiDomainError(
        400,
        'El paquete seleccionado no está activo.'
      );

    // 4. Validar FechaHoraInicio futura
    const inicioMs = new Date(dto.fechaHoraInicio).getTime();
    if (Number.isNaN(inicioMs) || inicioMs <= Date.now()) {
      throw new ApiDomainError(
        400,
        'La fecha y hora de inicio debe ser futura respecto a la hora actual.'
      );
    }

    // 5. Validar NumParticipantes contra Sala.CapacidadMaxima y Paquete.MaxParticipantes
    if (dto.numParticipantes <= 0) {
      throw new ApiDomainError(400, 'El número de participantes debe ser al menos 1.');
    }
    if (dto.numParticipantes > sala.capacidadMaxima) {
      throw new ApiDomainError(
        400,
        `El número de participantes (${dto.numParticipantes}) supera la capacidad máxima de la sala "${sala.nombre}" (${sala.capacidadMaxima}).`
      );
    }
    if (dto.numParticipantes > paquete.maxParticipantes) {
      throw new ApiDomainError(
        400,
        `El número de participantes (${dto.numParticipantes}) supera el cupo máximo del paquete "${paquete.nombre}" (${paquete.maxParticipantes}).`
      );
    }

    // 6. Calcular FechaHoraFin server-side
    const finMs = inicioMs + paquete.duracionMinutos * 60000;

    // 7. Regla Crítica: Prevención de Solapamiento de Horarios en la misma Sala
    const conflicto = db.reservas.find((r) => {
      if (r.idSala !== sala.id || r.estado === 'Cancelada') return false;
      const rInicio = new Date(r.fechaHoraInicio).getTime();
      const rFin = new Date(r.fechaHoraFin).getTime();
      return inicioMs < rFin && finMs > rInicio;
    });

    if (conflicto) {
      const hIni = new Date(conflicto.fechaHoraInicio).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const hFin = new Date(conflicto.fechaHoraFin).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new ApiDomainError(
        409,
        `Horario no disponible. La sala "${sala.nombre}" ya tiene una reserva activa entre ${hIni} y ${hFin}. Por favor, elige otro horario o sala.`
      );
    }

    // 8. Validar y descontar stock de Extras + congelar PrecioUnitarioHistorico
    const detallesExtras = [];
    for (const extraReq of dto.extras || []) {
      if (extraReq.cantidad <= 0) continue;
      const item = db.inventario.find((i) => i.id === extraReq.idItemExtra);
      if (!item) {
        throw new ApiDomainError(
          404,
          `El ítem extra solicitado no existe.`
        );
      }
      if (!item.activo) {
        throw new ApiDomainError(
          400,
          `El ítem "${item.nombre}" se encuentra inactivo.`
        );
      }
      if (item.stockDisponible < extraReq.cantidad) {
        throw new ApiDomainError(
          400,
          `Stock insuficiente para "${item.nombre}" (disponible: ${item.stockDisponible}, solicitado: ${extraReq.cantidad}).`
        );
      }
    }

    // Descontar en una sola unidad de trabajo
    let montoExtras = 0;
    for (const extraReq of dto.extras || []) {
      if (extraReq.cantidad <= 0) continue;
      const item = db.inventario.find((i) => i.id === extraReq.idItemExtra)!;
      item.stockDisponible -= extraReq.cantidad;
      const subtotal = Number((item.precioUnitario * extraReq.cantidad).toFixed(2));
      montoExtras += subtotal;
      detallesExtras.push({
        idItemExtra: item.id,
        nombreItem: item.nombre,
        categoria: item.categoria,
        cantidad: extraReq.cantidad,
        precioUnitarioHistorico: item.precioUnitario,
        subtotal,
      });
    }

    const montoPaquete = paquete.precio;
    const montoTotal = Number((montoPaquete + montoExtras).toFixed(2));
    const nuevaId = crypto.randomUUID();
    const ahora = nowIso();

    const nuevaReserva: ReservaDetalleDTO = {
      id: nuevaId,
      idCliente: idDueno,
      nombreCliente: nombreDueno,
      idSala: sala.id,
      nombreSala: sala.nombre,
      idPaquete: paquete.id,
      nombrePaquete: paquete.nombre,
      fechaHoraInicio: new Date(inicioMs).toISOString(),
      fechaHoraFin: new Date(finMs).toISOString(),
      numParticipantes: dto.numParticipantes,
      estado: 'Pendiente',
      montoPaquete,
      montoExtras,
      montoTotal,
      notasEspeciales: dto.notasEspeciales?.trim() || null,
      fechaCreacion: ahora,
      extras: detallesExtras,
    };

    db.reservas.unshift(nuevaReserva);
    db.historiales[nuevaId] = [
      {
        id: Date.now(),
        estadoAnterior: null,
        estadoNuevo: 'Pendiente',
        idUsuarioCambio: actor.rol === 'Cliente' ? null : actor.id,
        nombreUsuarioCambio:
          actor.rol === 'Cliente'
            ? 'Cliente (Creación Inicial)'
            : `${actor.nombre} (${actor.rol})`,
        fechaCambio: ahora,
      },
    ];

    saveDb(db);
    return nuevaReserva;
  },

  async cambiarEstadoReserva(
    idReserva: string,
    nuevoEstado: EstadoReservaNombre,
    actor: UsuarioDTO,
    token?: string | null
  ): Promise<ReservaDetalleDTO> {
    const live = await tryFetchLive<ReservaDetalleDTO>(
      `/reservas/${idReserva}/estado`,
      { method: 'PUT', body: JSON.stringify({ nuevoEstado }) },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    const reserva = db.reservas.find((r) => r.id === idReserva);
    if (!reserva) {
      throw new ApiDomainError(404, 'Reserva no encontrada.');
    }

    // 1. Si el actor es Cliente y no es dueño -> 404 (nunca 403, para no filtrar existencia)
    // 1. Si el actor es Cliente y no es dueño -> 404 (para no filtrar existencia)
    const esStaffOAdmin = actor.rol === 'Staff' || actor.rol === 'Admin';
    if (!esStaffOAdmin && reserva.idCliente !== actor.id) {
      throw new ApiDomainError(404, 'Reserva no encontrada.');
    }

    // 2. Confirmada nunca es destino válido por este endpoint (solo vía pago exitoso)
    if (nuevoEstado === 'Confirmada') {
      throw new ApiDomainError(
        400,
        'El estado "Confirmada" solo se alcanza automáticamente al registrar un pago exitoso.'
      );
    }

    // 3. Estado terminal (Completada / Cancelada)
    if (reserva.estado === 'Completada' || reserva.estado === 'Cancelada') {
      throw new ApiDomainError(
        400,
        `La reserva ya se encuentra en estado final (${reserva.estado}).`
      );
    }

    // 4. Tabla de transiciones válidas (ReservaService.cs:139-146)
    const transicionesValidas: Record<string, EstadoReservaNombre[]> = {
      Pendiente: ['Cancelada'],
      Confirmada: ['Cancelada', 'EnProceso'],
      EnProceso: ['Completada'],
    };

    const permitidas = transicionesValidas[reserva.estado] || [];
    if (!permitidas.includes(nuevoEstado)) {
      throw new ApiDomainError(
        400,
        `Transición no permitida de "${reserva.estado}" a "${nuevoEstado}".`
      );
    }

    // 5. Permisos por transición: EnProceso y Completada exigen Staff/Admin
    if ((nuevoEstado === 'EnProceso' || nuevoEstado === 'Completada') && !esStaffOAdmin) {
      throw new ApiDomainError(
        400,
        `Solo el personal autorizado puede cambiar la reserva a "${nuevoEstado}".`
      );
    }

    // 6. Si pasa a Cancelada, reponer stock de todos los DetallesReservaExtra
    if (nuevoEstado === 'Cancelada') {
      for (const det of reserva.extras) {
        const item = db.inventario.find((i) => i.id === det.idItemExtra);
        if (item) {
          item.stockDisponible += det.cantidad;
        }
      }
    }

    const estadoAnterior = reserva.estado;
    reserva.estado = nuevoEstado;

    if (!db.historiales[idReserva]) db.historiales[idReserva] = [];
    db.historiales[idReserva].push({
      id: Date.now(),
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      idUsuarioCambio: esStaffOAdmin ? actor.id : null,
      nombreUsuarioCambio: esStaffOAdmin
        ? `${actor.nombre} ${actor.apellido} (${actor.rol})`
        : 'Cliente (Autogestión)',
      fechaCambio: nowIso(),
    });

    saveDb(db);
    return reserva;
  },

  async obtenerHistorialReserva(
    idReserva: string,
    token?: string | null
  ): Promise<HistorialEstadoDTO[]> {
    const live = await tryFetchLive<HistorialEstadoDTO[]>(
      `/reservas/${idReserva}/historial`,
      { method: 'GET' },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    return db.historiales[idReserva] || [];
  },

  async procesarPago(
    dto: CrearPagoDTO,
    actor: UsuarioDTO,
    token?: string | null
  ): Promise<VoucherDTO> {
    const live = await tryFetchLive<VoucherDTO>(
      '/pagos',
      { method: 'POST', body: JSON.stringify(dto) },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    const reserva = db.reservas.find((r) => r.id === dto.idReserva);
    if (!reserva) {
      throw new ApiDomainError(404, 'La reserva no existe.');
    }

    if (reserva.estado !== 'Pendiente') {
      throw new ApiDomainError(
        409,
        `Solo se pueden pagar reservas en estado "Pendiente" (estado actual: "${reserva.estado}").`
      );
    }

    if (reserva.montoTotal <= 0) {
      throw new ApiDomainError(400, 'El monto a pagar debe ser mayor a 0.');
    }

    let transaccionRef = '';
    let nombreMetodo = '';

    if (dto.idMetodoPago === 1) {
      // Tarjeta vía Culqi
      if (!dto.culqiToken?.trim()) {
        throw new ApiDomainError(
          400,
          'Los datos de la tarjeta son obligatorios para procesar el pago online.'
        );
      }
      if (dto.culqiToken.includes('declined') || dto.culqiToken.includes('fail')) {
        db.pagos.push({
          idPago: crypto.randomUUID(),
          idReserva: reserva.id,
          monto: reserva.montoTotal,
          metodoPago: 'Tarjeta de Crédito/Débito (Culqi)',
          transaccionRef: `DECLINED-${Date.now()}`,
          fechaPago: nowIso(),
          exitoso: false,
        });
        saveDb(db);
        throw new ApiDomainError(
          400,
          'Tarjeta rechazada por la pasarela de pagos (Fondos insuficientes o rechazo del banco emisor). La reserva continúa Pendiente.'
        );
      }
      nombreMetodo = 'Tarjeta de Crédito/Débito (Culqi)';
      transaccionRef = `CULQI-${Math.floor(10000000 + Math.random() * 90000000)}`;
    } else {
      // Pago manual: Transferencia (2) o Efectivo (3) -> Solo Staff/Admin
      if (actor.rol === 'Cliente') {
        throw new ApiDomainError(
          400,
          'Solo el personal en local puede registrar pagos manuales en efectivo o transferencia.'
        );
      }
      if (typeof dto.exitoso !== 'boolean') {
        throw new ApiDomainError(
          400,
          'Debe indicar si el pago manual fue exitoso.'
        );
      }
      nombreMetodo =
        dto.idMetodoPago === 2 ? 'Transferencia Bancaria' : 'Efectivo en Taquilla';
      transaccionRef =
        dto.transaccionRef?.trim() || `MAN-${Math.floor(100000 + Math.random() * 900000)}`;

      if (!dto.exitoso) {
        db.pagos.push({
          idPago: crypto.randomUUID(),
          idReserva: reserva.id,
          monto: reserva.montoTotal,
          metodoPago: nombreMetodo,
          transaccionRef,
          fechaPago: nowIso(),
          exitoso: false,
        });
        saveDb(db);
        throw new ApiDomainError(
          400,
          'El pago manual fue registrado como no exitoso. La reserva permanece Pendiente.'
        );
      }
    }

    // Pago Exitoso -> Confirma automáticamente la reserva en la misma operación
    const ahora = nowIso();
    const idPago = crypto.randomUUID();
    db.pagos.push({
      idPago,
      idReserva: reserva.id,
      monto: reserva.montoTotal,
      metodoPago: nombreMetodo,
      transaccionRef,
      fechaPago: ahora,
      exitoso: true,
    });

    reserva.estado = 'Confirmada';
    if (!db.historiales[reserva.id]) db.historiales[reserva.id] = [];
    db.historiales[reserva.id].push({
      id: Date.now(),
      estadoAnterior: 'Pendiente',
      estadoNuevo: 'Confirmada',
      idUsuarioCambio: dto.idMetodoPago === 1 ? null : actor.id,
      nombreUsuarioCambio:
        dto.idMetodoPago === 1
          ? 'Confirmación Automática (Pago Culqi)'
          : `${actor.nombre} (${actor.rol} — Pago Manual)`,
      fechaCambio: ahora,
    });

    saveDb(db);

    return {
      idPago,
      idReserva: reserva.id,
      monto: reserva.montoTotal,
      metodoPago: nombreMetodo,
      transaccionRef,
      fechaPago: ahora,
      estadoReserva: 'Confirmada',
      sala: reserva.nombreSala,
      paquete: reserva.nombrePaquete,
      fechaHoraInicio: reserva.fechaHoraInicio,
      fechaHoraFin: reserva.fechaHoraFin,
    };
  },

  // --------------------------------------------------------------------------
  // BLOQUE 4 — REPORTES (ADMIN)
  // --------------------------------------------------------------------------
  async reporteIngresosPorMes(
    desde?: string,
    hasta?: string,
    token?: string | null
  ): Promise<IngresoMesDTO[]> {
    if (desde && hasta && new Date(desde) > new Date(hasta)) {
      throw new ApiDomainError(
        400,
        'La fecha "desde" no puede ser mayor que la fecha "hasta".'
      );
    }

    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const live = await tryFetchLive<IngresoMesDTO[]>(
      `/reportes/ingresos-por-mes${qs}`,
      { method: 'GET' },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    const desdeMs = desde ? new Date(desde).getTime() : null;
    // Fin de día completo (23:59:59.999) según especificación de Bloque 4
    const hastaDate = hasta ? new Date(hasta) : null;
    if (hastaDate) hastaDate.setUTCHours(23, 59, 59, 999);
    const hastaMs = hastaDate ? hastaDate.getTime() : null;

    const grupos = new Map<string, IngresoMesDTO>();
    for (const p of db.pagos) {
      if (!p.exitoso) continue;
      const t = new Date(p.fechaPago).getTime();
      if (desdeMs !== null && t < desdeMs) continue;
      if (hastaMs !== null && t > hastaMs) continue;

      const d = new Date(p.fechaPago);
      const anio = d.getUTCFullYear();
      const mes = d.getUTCMonth() + 1;
      const key = `${anio}-${String(mes).padStart(2, '0')}`;
      const actual = grupos.get(key) || { anio, mes, totalIngresos: 0 };
      actual.totalIngresos = Number((actual.totalIngresos + p.monto).toFixed(2));
      grupos.set(key, actual);
    }

    return Array.from(grupos.values()).sort((a, b) =>
      a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes
    );
  },

  async reportePaqueteMasDemandado(
    desde?: string,
    hasta?: string,
    token?: string | null
  ): Promise<PaqueteDemandaDTO[]> {
    if (desde && hasta && new Date(desde) > new Date(hasta)) {
      throw new ApiDomainError(
        400,
        'La fecha "desde" no puede ser mayor que la fecha "hasta".'
      );
    }

    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const live = await tryFetchLive<PaqueteDemandaDTO[]>(
      `/reportes/paquete-mas-demandado${qs}`,
      { method: 'GET' },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    const desdeMs = desde ? new Date(desde).getTime() : null;
    const hastaDate = hasta ? new Date(hasta) : null;
    if (hastaDate) hastaDate.setUTCHours(23, 59, 59, 999);
    const hastaMs = hastaDate ? hastaDate.getTime() : null;

    // Semilla base histórica + reservas activas
    const conteo = new Map<number, PaqueteDemandaDTO>([
      [2, { idPaquete: 2, paquete: 'COUPLES & DUO // THERAPY', totalReservas: 14 }],
      [3, { idPaquete: 3, paquete: 'EXECUTIVE MELTDOWN // VIP', totalReservas: 9 }],
      [1, { idPaquete: 1, paquete: 'RAGE STARTER // SPARK', totalReservas: 7 }],
      [4, { idPaquete: 4, paquete: 'TOTAL ANNIHILATION // SQUAD', totalReservas: 5 }],
    ]);

    for (const r of db.reservas) {
      if (r.estado === 'Cancelada') continue;
      const t = new Date(r.fechaHoraInicio).getTime();
      if (desdeMs !== null && t < desdeMs) continue;
      if (hastaMs !== null && t > hastaMs) continue;

      const item = conteo.get(r.idPaquete) || {
        idPaquete: r.idPaquete,
        paquete: r.nombrePaquete,
        totalReservas: 0,
      };
      item.totalReservas += 1;
      conteo.set(r.idPaquete, item);
    }

    return Array.from(conteo.values()).sort((a, b) => b.totalReservas - a.totalReservas);
  },

  async reporteHorasPico(
    desde?: string,
    hasta?: string,
    token?: string | null
  ): Promise<HoraPicoDTO[]> {
    if (desde && hasta && new Date(desde) > new Date(hasta)) {
      throw new ApiDomainError(
        400,
        'La fecha "desde" no puede ser mayor que la fecha "hasta".'
      );
    }

    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const live = await tryFetchLive<HoraPicoDTO[]>(
      `/reportes/horas-pico${qs}`,
      { method: 'GET' },
      token
    );
    if (live.handled) return live.data;

    const db = loadDb();
    const mapa = new Map<number, number>([
      [16, 4],
      [17, 6],
      [18, 11],
      [19, 15],
      [20, 13],
      [21, 9],
      [22, 5],
    ]);

    for (const r of db.reservas) {
      if (r.estado === 'Cancelada') continue;
      const h = new Date(r.fechaHoraInicio).getUTCHours();
      mapa.set(h, (mapa.get(h) || 0) + 1);
    }

    return Array.from(mapa.entries())
      .map(([hora, totalReservas]) => ({ hora, totalReservas }))
      .sort((a, b) => b.totalReservas - a.totalReservas);
  },
};

