# auth

Registro, login y heartbeat de sesión. No incluye gestión de perfil propio
(`/api/usuarios/me`, ver [`usuarios`](../usuarios/)) ni administración de
usuarios/roles (ver [`admin-usuarios`](../admin-usuarios/)).

**Files:** `Controllers/AuthController.cs`, `Services/AuthService.cs`,
`Services/JwtTokenService.cs`, `Configuration/JwtSettings.cs`,
`Validators/Validators.cs` (`RegistroValidator`, `LoginValidator`).

## Entidades / Tablas

No define entidades propias. Lee y escribe `Usuario` (ver
[`usuarios`](../usuarios/README.md)) y lee `Role` (ver
[`admin-usuarios`](../admin-usuarios/README.md)) para resolver el rol
`Cliente` al registrar.

## Endpoints / entry points

| Method | Path | Auth | Input | Output |
|---|---|---|---|---|
| POST | `/api/auth/registro` | Anónimo | `RegistroDTO` | 201 `UsuarioDTO`, header `Location: /api/usuarios/me` |
| POST | `/api/auth/login` | Anónimo | `LoginDTO` | 200 `LoginRespuestaDTO` (`Token`, `ExpiraEn`, `Usuario`) |
| POST | `/api/auth/heartbeat` | JWT (cualquier rol) | — | 204 |
