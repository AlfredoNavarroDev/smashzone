# Notas — admin-usuarios

## Dependencias

Usa `AuthService.NormalizarEmail` (módulo `auth`) en `AdminSeeder`, y
depende de `UltimaActividad` siendo mantenido por
`AuthController.Heartbeat` (módulo `auth`) para que `Online`/`Activos7Dias`
tengan sentido. Comparte las entidades `Usuario`/`Role` con `usuarios` y
`auth` — ningún módulo es dueño exclusivo de esas tablas.

## Notas

- **Gap de cobertura de integración:** no existe un
  `AdminUsuariosEndpointsTests` (ni similar) — la única prueba a nivel
  HTTP que toca `api/admin` vive en `AuthEndpointsTests.cs`
  (`RutaAdmin_SinToken_Da401`, línea ~100) y solo verifica 401/403/200 en
  `usuarios/resumen`. `Listar` (con filtros), `CambiarRol` y
  `CambiarEstado` solo están probados a nivel de servicio, no de
  endpoint/HTTP — el binding de query params (`FiltroUsuariosDTO`) y los
  bodies (`CambiarRolDTO`/`CambiarEstadoDTO`) no tienen test end-to-end.
- No hay test unitario que cubra "otro actor (no el Admin objetivo)
  deshabilita al último Admin activo" de forma simétrica al que sí existe
  para `CambiarRol_NoPuedeDejarElSistemaSinAdmins` — `CambiarEstado` solo
  prueba la autodeshabilitación, no ese caso vía `ExigirOtroAdminActivo`.
  Abierto: no se pudo confirmar por lectura de test si este camino está
  cubierto; sí está cubierto por el código (línea 87-89 de
  `AdminUsuarioService.cs`), solo falta el test explícito.
- Ningún DTO de este módulo tiene validator FluentValidation (ver
  `validacion.md`) — si el equipo decide agregar límites (p.ej. longitud
  máxima de `Texto`) no hay un lugar ya establecido más que crear uno
  nuevo en `Backend/Validators/`.
