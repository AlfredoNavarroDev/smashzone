# Flujo — auth

## `POST /api/auth/registro`

1. `FluentValidationFilter` corre `RegistroValidator` antes de llegar al
   controller (400 si falla — ver `validacion.md`).
2. `AuthService.RegistrarAsync` normaliza el email (`Trim().ToLowerInvariant()`,
   `AuthService.cs:21`) y busca duplicados **ya normalizado** — un registro con
   `ANA@correo.com` colisiona con uno existente en `ana@correo.com`
   (`ConflictoException` → 409).
3. Resuelve el rol `Cliente` desde la tabla `Roles` por nombre
   (`AuthService.RolCliente = "Cliente"`). Si el rol no existe en la BD
   (script de seed no corrido), `NoEncontradoException` → 404 — no es un
   400 de validación de input, es un problema de datos de BD.
4. Hashea el password con BCrypt (`BCrypt.Net.BCrypt.HashPassword`, sin
   factor de costo explícito → usa el default de la librería).
5. `Activo = true` desde el alta — no hay paso de verificación de email.
6. `FechaRegistro` se asigna desde `TimeProvider` inyectado (no
   `DateTime.UtcNow` directo — testeable).
7. Controller devuelve `201 Created` con `Location: /api/usuarios/me` — un
   path fijo, no `/api/usuarios/{id}` (no existe ese endpoint para el
   propio usuario; "me" ya resuelve por el token).

## `POST /api/auth/login`

1. `LoginValidator` solo exige no-vacíos (`validacion.md`) — la fuerza del
   password ya se validó en el registro, aquí solo se compara el hash.
2. Normaliza el email igual que en registro.
3. Si el usuario no existe **o** el password no verifica contra el hash
   (`BCrypt.Net.BCrypt.Verify`), lanza el mismo mensaje
   `"Credenciales inválidas."` (`NoAutorizadoException` → 401) — deliberado,
   comentario en código línea 56: "no revelar si el email existe."
4. Si el usuario existe, password correcto, pero `Activo == false`:
   mensaje distinto, `"La cuenta está deshabilitada..."` — este caso **sí**
   revela que la cuenta existe (no sigue el mismo criterio de no-revelar
   que el paso anterior; ver `dudas-recurrentes.md`).
5. Actualiza `UltimoAcceso` y `UltimaActividad` al momento del login.
6. Genera el JWT (`JwtTokenService.Generar`, requiere `IdRolNavigation`
   cargado — el query incluye `.Include(u => u.IdRolNavigation)`).
7. Devuelve también `ExpiraEn` (timestamp absoluto, no segundos restantes)
   calculado independientemente del token mismo
   (`time.GetUtcNow().AddMinutes(ExpirationMinutes)` — no se decodifica el
   JWT recién emitido, se recalcula con la misma fórmula).

## `POST /api/auth/heartbeat`

1. Requiere JWT válido (`[Authorize]`, sin rol específico).
2. Extrae el `Guid` del usuario desde el claim `sub` del token
   (`ClaimsPrincipalExtensions.GetUserId`, `Infrastructure.cs:12`) — si el
   claim falta o no parsea como `Guid`, `NoAutorizadoException` antes de
   llegar al service.
3. `AuthService.HeartbeatAsync` reconfirma que el usuario existe y sigue
   `Activo` — un usuario deshabilitado **después** de emitir su token
   pierde heartbeat (401) aunque el JWT en sí siga siendo válido
   criptográficamente y no haya expirado.
4. Solo actualiza `UltimaActividad`, no `UltimoAcceso` (ese es solo de
   login) ni extiende la expiración del JWT — el frontend lo llama cada
   ~60s (comentario en `AuthController.cs:25`) puramente para marcar
   presencia, no para refrescar sesión.

## Generación del JWT (`JwtTokenService`)

Claims: `sub` (id), `email`, `jti` (único por token, no reusado para
revocación), `role` (`ClaimTypes.Role`, un solo rol — el modelo no soporta
multi-rol). Firma HMAC-SHA256 con el secreto de `JwtSettings:Secret`
(validado ≥32 caracteres al arrancar la app, `Program.cs:24` — fuera de
este unit pero condiciona que el servicio ni siquiera levante sin un
secreto suficientemente largo). `NameClaimType = "sub"` se configura en
`Program.cs:45`, no aquí.
