# Bloque 2 — Catálogo (Salas, Paquetes, Inventario)

## Alcance

- Configuración de Salas (nombre, capacidad máxima, estado
  Disponible/Mantenimiento).
- Paquetes de destrucción (nombre, descripción, precio, duración, lista de
  ítems incluidos).
- Inventario de objetos destruibles (nombre, categoría, precio adicional,
  stock actual).
- CRUD completo de las tres entidades, protegido para `Admin`
  (lectura pública/para `Cliente` en Salas y Paquetes al navegar el
  catálogo).

## Entidades dueñas

`Salas`, `Paquetes`, `ItemsInventario`.

## Backend — piezas a implementar

- `SalasController`, `PaquetesController`, `InventarioController`
  (CRUD + `GET` de listado con filtro por estado/categoría).
- `InventarioService` debe exponer un método para descontar/verificar
  stock, que el bloque 3 (Reservas) va a consumir al crear una reserva con
  extras.
- DTOs: `SalaDTO`, `PaqueteDTO`, `ItemInventarioDTO` + sus variantes
  `CrearXDTO`/`ActualizarXDTO`.

## Frontend — piezas a implementar

- Catálogo público: listado de Salas disponibles y Paquetes (para
  `Cliente` al momento de reservar).
- Panel Admin: CRUD de Salas, Paquetes e Inventario.

## Contrato de API

Completar en `docs/api-contracts.md#bloque-2--catálogo` apenas se definan
los DTOs exactos.

## Coordinación con otros bloques

- Bloque 3 (Reservas) necesita leer Salas/Paquetes disponibles y
  verificar/descontar stock de Inventario — coordinar el contrato de
  `InventarioService` antes de que bloque 3 lo consuma.
- Bloque 4 (Reportes) necesita leer qué Paquete es más demandado —
  coordinar qué datos expone este bloque para agregación.
