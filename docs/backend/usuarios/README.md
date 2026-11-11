# usuarios

Autogestión del perfil del usuario autenticado: ver sus propios datos,
editar nombre/apellido/teléfono y cambiar su contraseña. No incluye
gestión de otros usuarios ni de roles — eso vive en `admin-usuarios`
(`AdminUsuariosController`, bajo `api/admin`), documentado aparte.

**Files:** `Controllers/UsuariosController.cs`, `Services/UsuarioService.cs`,
`DTOs/AuthDTOs.cs` (`UsuarioDTO`, `ActualizarPerfilDTO`,
`CambiarPasswordDTO` — compartido con el módulo `auth`),
`Validators/Validators.cs` (`ActualizarPerfilValidator`,
`CambiarPasswordValidator`), `Mapping/UsuarioProfile.cs`.

## Entidades / Tablas

Reutiliza `Usuario` y `Role`, definidos y propiedad del módulo `auth`
(tabla `Usuarios`, FK `IdRol` → `Roles`). Este módulo no agrega entidades
propias, solo opera sobre el usuario identificado por el token.

## Endpoints / entry points

| Method | Path | Auth | Input | Output |
|---|---|---|---|---|
| GET | `api/usuarios/me` | Cualquier rol autenticado | — | `UsuarioDTO` |
| PUT | `api/usuarios/me` | Cualquier rol autenticado | `ActualizarPerfilDTO` | `UsuarioDTO` |
| PUT | `api/usuarios/me/password` | Cualquier rol autenticado | `CambiarPasswordDTO` | 204 No Content |
