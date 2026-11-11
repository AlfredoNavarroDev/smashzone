# admin-usuarios

Gestión administrativa de usuarios y roles: listado paginado/filtrado,
resumen de métricas, y cambio de rol/estado. Distinto de
[`usuarios`](../usuarios/) (self-service: perfil propio) — aquí un Admin
opera sobre *cualquier* usuario del sistema.

**Files:** `Controllers/AdminUsuariosController.cs`,
`Services/AdminUsuarioService.cs`, `DTOs/AdminDTOs.cs`,
`Services/AdminSeeder.cs` (seed de un Admin inicial, no un endpoint).

## Entidades / Tablas

Reutiliza `Usuario` y `Role`, propiedad del módulo `usuarios` /
`auth` — este módulo no define entidades propias, solo las lee/escribe
(`IdRol`, `Activo`) a través de `SmashZoneDbContext`.

## Endpoints / entry points

Todos bajo `[Authorize(Roles = "Admin")]` a nivel de clase — ningún
`AllowAnonymous`.

| Método | Path | Input | Output |
|---|---|---|---|
| GET | `/api/admin/usuarios` | query `FiltroUsuariosDTO` (texto, idRol, activo, online, pagina, tamanoPagina) | `PaginadoDTO<AdminUsuarioDTO>` |
| GET | `/api/admin/usuarios/resumen` | — | `UsuariosResumenDTO` |
| GET | `/api/admin/usuarios/{id:guid}` | — | `AdminUsuarioDTO` |
| PUT | `/api/admin/usuarios/{id}/rol` | body `CambiarRolDTO { IdRol }` | `AdminUsuarioDTO` |
| PUT | `/api/admin/usuarios/{id}/estado` | body `CambiarEstadoDTO { Activo }` | `AdminUsuarioDTO` |
| GET | `/api/admin/roles` | — | `List<RolDTO>` |
