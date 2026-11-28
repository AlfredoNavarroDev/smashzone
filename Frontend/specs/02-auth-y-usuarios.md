# Spec 02 — Módulo de Autenticación, Perfil y Administración de Usuarios

> **Bloque asociado:** Bloque 1 (`auth`, `usuarios`, `admin-usuarios`)  
> **Contratos Backend:** [`../../api-contracts.md#bloque-1--auth-y-usuarios`](../../api-contracts.md) y [`../../backend/auth/`](../../backend/auth/)

---

## 1. Registro de Clientes (`POST /api/auth/registro`)

### Reglas de Validación en Cliente (Espejo de `RegistroValidator`)
- `nombre`: Obligatorio, máx. 100 caracteres.
- `apellido`: Obligatorio, máx. 100 caracteres.
- `email`: Obligatorio, formato email válido, máx. 150 caracteres. Se normaliza (`trim().toLowerCase()`).
- `password`: Obligatorio, entre **8 y 100 caracteres**, debe contener al menos **una minúscula**, **una mayúscula** y **un dígito** (`/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,100}/`). *Nota del backend: no exige carácter especial.*
- `telefono`: Opcional, máx. 20 caracteres.
- `documentoIdentidad`: Opcional, máx. 20 caracteres.

### Respuestas Esperadas
- `201 Created`: Devuelve `UsuarioDTO` (rol siempre `Cliente`, `activo: true`). El frontend puede iniciar sesión automáticamente o pasar a la pestaña de Login con el email autocompletado.
- `409 Conflict`: El email ya está registrado (sin distinguir mayúsculas/minúsculas).

---

## 2. Inicio de Sesión (`POST /api/auth/login`)

- **Request (`LoginDTO`):** `{ email, password }` (ambos no vacíos).
- **Response `200 OK` (`LoginRespuestaDTO`):**
  ```ts
  interface LoginRespuestaDTO {
    token: string;
    expiraEn: string; // ISO-8601 UTC
    usuario: UsuarioDTO;
  }
  ```
- **Manejo de `401 Unauthorized`:**
  - Credenciales incorrectas: `"Credenciales inválidas."` (el backend no revela si el correo existe).
  - Cuenta inactiva: `"La cuenta está deshabilitada..."` (el backend informa explícitamente este estado).

---

## 3. Heartbeat de Sesión (`POST /api/auth/heartbeat`)

- Invocado automáticamente cada **60 segundos** por `AuthContext` mientras exista token.
- No extiende el tiempo de vida del JWT (`expiraEn`), pero actualiza `UltimaActividad` en el servidor para alimentar el indicador `online` en `/api/admin/usuarios`.
- Si recibe `401` (porque el usuario fue deshabilitado mientras navegaba), ejecuta `logout()` de inmediato.

---

## 4. Perfil Propio (`GET / PUT /api/usuarios/me` y `PUT /api/usuarios/me/password`)

- **Editar Perfil (`PUT /api/usuarios/me`):** Envía `{ nombre, apellido, telefono }` y actualiza el `UsuarioDTO` en el contexto.
- **Cambiar Contraseña (`PUT /api/usuarios/me/password`):** Envía `{ passwordActual, passwordNueva }`. Valida `PasswordSegura` en `passwordNueva`. Devuelve `204 No Content` o `400` si `passwordActual` no coincide.

---

## 5. Administración de Usuarios — Solo Rol `Admin` (`/api/admin/usuarios`)

Integrado dentro del **Command Center Admin**:
1. **Tarjetas de Resumen (`GET /api/admin/usuarios/resumen`):**
   - `totalRegistrados`, `habilitados`, `deshabilitados`, `onlineAhora` (actividad < 5 min), `activos7Dias`, distribución `porRol[]` y sparkline de `registrosPorDia[30]`.
2. **Tabla Paginada con Filtros (`GET /api/admin/usuarios`):**
   - Filtros combinables: `texto` (nombre/email), `idRol`, `activo` (`true`/`false`), `online` (`true`/`false`), `pagina`, `tamanoPagina` (máx. 100).
3. **Cambio de Rol (`PUT /api/admin/usuarios/{id}/rol`):**
   - Selector `Cliente` / `Staff` / `Admin` consumiendo `GET /api/admin/roles`.
4. **Habilitar / Deshabilitar (`PUT /api/admin/usuarios/{id}/estado`):**
   - Baja lógica (`{ activo: boolean }`).
   - **Protección crítica en UI y Backend (`400`):** Un Admin no puede deshabilitarse ni quitarse su propio rol de Admin, ni dejar al sistema con 0 Admins activos.

