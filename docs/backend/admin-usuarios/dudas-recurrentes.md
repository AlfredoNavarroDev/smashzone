# Dudas recurrentes — admin-usuarios

**P: ¿Por qué `CambiarEstado` revisa `actorId == id` antes que la regla
de "debe quedar otro Admin activo"?**
R: Es el orden de los `if` en
`Backend/Backend/Services/AdminUsuarioService.cs:83-89`. Un Admin que se
autodeshabilita siempre ve `"No puedes deshabilitar tu propia cuenta."`,
nunca el mensaje de "otro Admin activo", aunque técnicamente ambas
condiciones podrían aplicar.

**P: ¿"Online" es tiempo real (websocket/sesión activa)?**
R: No — es un cálculo derivado: `Activo && UltimaActividad >= Ahora -
5min` (`AdminUsuarioService.VentanaOnline`,
`Services/AdminUsuarioService.cs:21`). `UltimaActividad` la actualiza
`AuthController.Heartbeat` (módulo `auth`), que el frontend debe llamar
periódicamente; sin heartbeats, un usuario conectado pero sin llamar ese
endpoint figura offline.

**P: ¿Qué pasa si subo a un usuario a Admin? ¿Hay algún chequeo?**
R: No — `ExigirOtroAdminActivo` solo se invoca cuando un usuario *pierde*
el rol Admin o se deshabilita siendo Admin
(`Services/AdminUsuarioService.cs:66-71, 87-89`). Ascender a Admin no
pasa por ninguna validación de negocio adicional a la existencia del rol.

**P: ¿Deshabilitar a un usuario invalida su JWT activo?**
R: No — no hay mecanismo de revocación de tokens en el proyecto; un JWT
emitido antes de la deshabilitación sigue siendo válido hasta su
expiración natural (ver `auth`). `Activo = false` solo bloquea lo que
vuelve a consultarse contra BD.
