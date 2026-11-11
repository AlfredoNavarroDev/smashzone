# Tests — paquetes

`Backend.Tests/Services/PaqueteServiceTests.cs`: crear persiste y devuelve
`Activo=true`; nombre duplicado en crear lanza `ConflictoException`;
obtener inexistente lanza `NoEncontradoException`; actualizar cambia
datos; actualizar con nombre duplicado de otro paquete lanza
`ConflictoException`; cambiar estado desactiva; listar filtra por
`activo`.

`Backend.Tests/Services/CatalogoValidatorTests.cs` (casos de Paquete):
paquete válido pasa; descripción vacía falla; precio no positivo falla
(`0` y `-10`, `[Theory]`); `MaxParticipantes = 0` falla.

`Backend.Tests/Integration/CatalogoEndpointsTests.cs`: no tiene casos
dedicados a `/api/paquetes` — el patrón de auth (anónimo en GET, 401 sin
token, 403 cliente / 201 admin en POST) solo se ejercita a nivel HTTP
contra `/api/salas` como representante del grupo de controllers de
catálogo (mismo `[Authorize(Roles="Admin")]` + `[AllowAnonymous]` en los
tres). Ver `notas.md`.
