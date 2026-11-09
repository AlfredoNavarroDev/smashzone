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
