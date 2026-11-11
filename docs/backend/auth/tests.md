# Tests — auth

- `AuthServiceTests.cs`: hash de password al registrar (nunca se guarda en
  texto plano), duplicado de email case-insensitive (`ANA@` vs `ana@`),
  login exitoso actualiza `UltimoAcceso`/`UltimaActividad` y devuelve
  token, password incorrecto → `NoAutorizadoException`, email inexistente
  → `NoAutorizadoException`, usuario `Activo=false` → `NoAutorizadoException`,
  heartbeat actualiza `UltimaActividad`.
- `JwtTokenServiceTests.cs`: el token generado incluye los claims
  `sub`/`email`/`role` correctos y expira a los 60 minutos (tolerancia de
  2s en el assert).
- `ValidatorTests.cs`: `RegistroValidator` acepta un DTO válido, rechaza
  passwords débiles (corta, sin número, sin minúscula — tabla de casos) y
  email con formato inválido.
- `AuthEndpointsTests.cs` (integración, `ApiFactory`): registro con email
  duplicado → 409 y login subsecuente con password incorrecto → 401 en la
  misma prueba; registro con password débil → 400 end-to-end (confirma que
  `FluentValidationFilter` corre antes del controller). También ejercita
  rutas de `admin-usuarios` (401 sin token, 403 como Cliente, 200 como
  Admin) y `usuarios/me` usando el token emitido por login — esos asserts
  viven en esta clase pero pertenecen conceptualmente a los otros units.
