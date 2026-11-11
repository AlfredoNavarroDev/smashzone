# Flujo — admin-usuarios

## `Listar` (`GET /api/admin/usuarios`)

Filtra en memoria vía LINQ-a-SQL sobre `db.Usuarios`:
- `Texto`: `Contains` case-insensitive (`.ToLower()`) sobre
  Nombre/Apellido/Email.
- `IdRol`, `Activo`: igualdad directa.
- `Online`: `Activo && UltimaActividad >= Ahora - VentanaOnline` (5 min,
  `AdminUsuarioService.VentanaOnline`) — "online" es una ventana deslizante
  basada en el último heartbeat (`AuthController.Heartbeat`, módulo
  `auth`), no un socket/sesión en vivo.

Paginación: `Pagina` se fuerza a mínimo 1, `TamanoPagina` se clampa a
`[1, 100]` — un cliente que pida `TamanoPagina=0` o `=10000` no provoca
error, solo se ajusta silenciosamente (sin validación FluentValidation,
ver `validacion.md`).

## `Resumen` (`GET /api/admin/usuarios/resumen`)

Cinco queries independientes contra `db.Usuarios`/`db.Roles` (no una sola
agregación): total, habilitados, online (`UltimaActividad >= ahora - 5min`),
activos en 7 días, conteo por rol. `RegistrosPorDia` reconstruye los
últimos 30 días completos con `Enumerable.Range(0, 30)` y rellena huecos
con `0` (`conteo.GetValueOrDefault(d)`) — días sin registros aparecen en
la serie en vez de faltar, igual patrón que el módulo `reportes`.

## `CambiarRol` (`PUT /api/admin/usuarios/{id}/rol`)

1. Carga el usuario (`Include(IdRolNavigation)`) — 404 si no existe.
2. Carga el rol destino — 404 (`NoEncontradoException`) si `idRol` no
   existe en `Roles`.
3. Si el usuario **es** Admin y el rol destino **no** es Admin (está
   perdiendo el rol Admin):
   - si `actorId == id` (se lo quita a sí mismo) → 400
     (`"No puedes quitarte tu propio rol de Admin."`).
   - si no, exige que exista **otro** Admin activo distinto de `id`
     (`ExigirOtroAdminActivo`) → 400 si no hay (`"Debe existir al menos
     otro Admin activo."`).
4. Si pasa las validaciones, actualiza `IdRol` y guarda.

El chequeo de "no dejar el sistema sin Admins" solo se dispara si el
usuario *era* Admin y *deja* de serlo — subir a alguien a Admin, o cambiar
el rol de un no-Admin a otro no-Admin, no pasa por `ExigirOtroAdminActivo`.

## `CambiarEstado` (`PUT /api/admin/usuarios/{id}/estado`)

Mismo patrón de auto-protección que `CambiarRol`, pero sobre
deshabilitar (`Activo = false`):
1. 404 si el usuario no existe.
2. Si se está deshabilitando (`activo == false`):
   - `actorId == id` → 400 (`"No puedes deshabilitar tu propia cuenta."`)
     — se evalúa **antes** del chequeo de rol, así que un Admin
     intentando autodeshabilitarse recibe siempre este mensaje, nunca el
     de "debe existir otro Admin".
   - si el usuario es Admin → exige otro Admin activo, igual que en
     `CambiarRol`.
3. Habilitar (`activo == true`) no tiene restricciones — cualquier Admin
   puede reactivar a cualquiera, incluido otro Admin.

Deshabilitar a un usuario **no** invalida sus tokens JWT ya emitidos — el
JWT sigue siendo válido hasta que expira (ver módulo `auth`); solo bloquea
acciones que vuelvan a consultar `Activo` en BD. No hay revocación de
tokens en este proyecto.

## `AdminSeeder.SeedAsync` (arranque, solo Development)

No es un endpoint — corre una vez en `Program.cs` (`if
(app.Environment.IsDevelopment())`), antes de `app.Run()`. Solo actúa si
`SeedAdmin:Email` y `SeedAdmin:Password` están configurados (user-secrets
o variables de entorno — nunca en el repo). Si el rol `Admin` no existe
aún en `Roles` (BD sin el script aplicado), sale en silencio (`return`).
Si el usuario con ese email no existe, lo crea; si existe, le **fuerza**
rol Admin, `Activo = true` y reescribe el hash de password — es
idempotente y "repara" la cuenta admin de desarrollo en cada arranque.
Cualquier excepción (BD no creada) se loguea como warning y no impide que
la API arranque.
