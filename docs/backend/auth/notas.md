# Notas — auth

## Dependencias

- Lee/escribe `Usuario` y lee `Role` — entidades propiedad del unit
  `usuarios`/`admin-usuarios` respectivamente.
- `JwtTokenService` requiere `Usuario.IdRolNavigation` ya cargado por
  quien lo llama (comentario en `JwtTokenService.cs:23`) — si algún
  consumidor futuro pasa un `Usuario` sin esa navegación cargada, lanza
  `NullReferenceException` sin traducir a un `DomainException` legible.
- Consumido indirectamente por todos los demás controllers vía el
  middleware de autenticación JWT global (`Program.cs:32-47`), no hay
  dependencia de código directa.

## Notas

- No hay revocación de tokens (logout real) — un JWT emitido es válido
  hasta su expiración natural sin forma de invalidarlo del lado servidor,
  salvo desactivar la cuenta (y eso solo bloquea `/heartbeat`, no el resto
  de endpoints autenticados; ver `dudas-recurrentes.md`).
- No hay endpoint de "olvidé mi password" / reset — solo
  `CambiarPasswordDTO` (unit `usuarios`), que requiere conocer el password
  actual.
- `AuthService.PasswordValido` atrapa cualquier excepción de
  `BCrypt.Verify` y devuelve `false` en vez de propagarla (`AuthService.cs:86-88`,
  comentario: "hash con formato inválido, ej. datos semilla de ejemplo") —
  protege contra usuarios sembrados con un hash no-BCrypt, pero también
  oculta silenciosamente cualquier otro error de formato de hash.
- No se pudo confirmar en el código si existe rate limiting o bloqueo
  temporal tras intentos fallidos de login — no hay lógica de intentos en
  `AuthService` ni middleware de throttling visible en `Program.cs`. Gap
  abierto, no confirmado como ausente a nivel infraestructura (podría
  vivir en un proxy/WAF fuera del repo).
