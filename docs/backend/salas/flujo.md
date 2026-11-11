# Flujo — salas

## Listar / Obtener

Lectura directa, sin reglas de negocio. `Listar` filtra por `Activa` solo
si `activa` viene en la query; sin filtro, devuelve todas (activas e
inactivas) — el frontend decide qué mostrar. `Obtener` lanza
`NoEncontradoException` (404) si el id no existe
(`SalaService.cs:58-59`).

## Crear

1. Valida nombre único vía `ValidarNombreUnico` — comparación exacta
   (`==`) sobre el nombre ya `Trim()`-eado, **no** case-insensitive. "Sala
   A" y "sala a" no colisionan (`SalaService.cs:61-66`).
2. Si existe, `ConflictoException` (409).
3. Inserta con `Activa = true` siempre — no hay forma de crear una sala
   ya inactiva.

## Actualizar

Mismo chequeo de nombre único, excluyendo el propio id
(`excluirId: id`). No permite cambiar `Activa` desde este endpoint — solo
`Nombre`, `CapacidadMaxima`, `Descripcion`.

## CambiarEstado

Solo flip de un booleano (`SalaService.cs:50-56`). No es soft-delete en
el sentido de ocultar el registro — una sala inactiva sigue devuelta por
`GET /api/salas` (sin filtro) y sigue siendo `GET /api/salas/{id}`-eable;
"inactiva" solo es una bandera que el frontend (o `ReservaService`, fuera
de este unit) puede usar para bloquear nuevas reservas sobre ella. No se
verificó aquí si `ReservaService` efectivamente respeta ese flag — ver
`notas.md`.
