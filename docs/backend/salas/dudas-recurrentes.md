# Dudas recurrentes — salas

**P: ¿Por qué `GET /api/salas` y `GET /api/salas/{id}` son anónimos si el
controller tiene `[Authorize(Roles = "Admin")]` a nivel de clase?**
R: Ambos tienen `[AllowAnonymous]` explícito
(`SalasController.cs:13,16`), que sobreescribe el `[Authorize]` de clase.
El catálogo de salas es público (el frontend lo necesita para mostrar
disponibilidad sin login); solo las mutaciones son admin-only.

**P: ¿La verificación de nombre duplicado distingue mayúsculas/minúsculas?**
R: No. `ValidarNombreUnico` compara con `==` sobre strings ya
`Trim()`-eados (`SalaService.cs:63-65`) — EF Core traduce esto a una
comparación SQL que, con collation case-insensitive (default en SQL
Server), en la práctica sí trata "Sala A" y "sala a" como iguales. El
código no fuerza explícitamente ese comportamiento, depende del collation
de la base.

**P: ¿Desactivar una sala le impide seguir recibiendo reservas?**
R: No se pudo confirmar desde este unit — `CambiarEstadoAsync` solo
cambia el booleano, no verifica reservas futuras ni bloquea nada aquí
mismo. Ver `notas.md`.
