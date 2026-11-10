# Bloque 1 — Auth + Usuarios

## Alcance

- Registro de usuarios clientes.
- Login con JWT.
- Roles: `Admin`, `Staff`, `Cliente` (seed inicial en la migración o
  `DbContext.OnModelCreating`/seed data).
- Gestión de perfil del usuario autenticado.
- Middleware/atributo de autorización por rol, reutilizable por los otros
  3 bloques (`[Authorize(Roles = "Admin,Staff")]`).

## Entidades dueñas

`Roles`, `Usuarios` (schema completo en
`docs/Rage Room Management Platform Specification.md`).

## Backend — piezas a implementar

- `AuthController`: `POST /api/auth/registro`, `POST /api/auth/login`.
- `UsuariosController`: `GET /api/usuarios/me`, `PUT /api/usuarios/me`.
- `AuthService`: hash de password (ej. `BCrypt` o
  `PasswordHasher<Usuario>` de Identity), generación de JWT.
- Configuración de JWT en `Program.cs` (`AddAuthentication` +
  `AddJwtBearer`), parámetros en `appsettings.json` → `JwtSettings`.
- DTOs: `RegistroDTO`, `LoginDTO`, `UsuarioDTO` (nunca expone
  `PasswordHash`).

## Frontend — piezas a implementar

- Páginas: Login, Registro.
- `AuthContext` (guarda token + datos de usuario, expone `login`,
  `logout`, `isAuthenticated`).
- Cliente API (`src/api/auth.ts`) que adjunta el JWT en cada request.
- Guard de rutas por rol (ej. redirigir si un `Cliente` intenta acceder a
  una ruta de `Admin`).

## Contrato de API

Ver `docs/api-contracts.md#bloque-1--auth` — mantenerlo actualizado al
agregar/cambiar endpoints.

## Riesgos / cosas a no olvidar

- Nunca loguear ni devolver el password/hash en ninguna respuesta.
- El secret de JWT en local vive en `appsettings.Development.json`
  (ignorado por git), no en `appsettings.json`.

## Estado de implementación

Implementado: registro, login JWT (60 min), perfil y cambio de contraseña, heartbeat de actividad,
panel Admin (`/admin/usuarios`) con métricas, filtros, cambio de rol y habilitar/deshabilitar.
Hash con BCrypt.Net-Next. Pruebas: `dotnet test` (Backend/) y `npm test` (Frontend/).

Cómo probarlo en local:
1. `docker compose up -d` y aplicar `Database/script.sql` (ver `docs/base-de-datos.md`).
2. Copiar `Backend/Backend/appsettings.Development.example.json` a `appsettings.Development.json` y completar
   cadena de conexión, `JwtSettings:Secret` (≥ 32 caracteres) y `SeedAdmin`.
3. `dotnet run --project Backend/Backend` (http://localhost:5021) y `npm run dev` en `Frontend/` (copiar `.env.example` a `.env` si cambia la URL).

Nota: el layout/router del Frontend es un shell mínimo para poder montar Login, Perfil y Admin;
el Bloque 4 puede reemplazarlo por el definitivo.

