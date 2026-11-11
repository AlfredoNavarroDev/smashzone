# reservas

Gestiona el ciclo de vida de una reserva de sala: creación con
validación de disponibilidad/cupo/stock, transición de estados
(`Pendiente → Confirmada → EnProceso → Completada`, o `→ Cancelada`
desde los dos primeros) y el historial auditable de esos cambios.

**Files:** `Controllers/ReservasController.cs`,
`Services/ReservaService.cs`, `DTOs/ReservaDTOs.cs`,
`Validators/ReservaValidators.cs`, `Mapping/ReservaProfile.cs`.

## Entidades / Tablas

| Entidad | Tabla | Notas |
|---|---|---|
| `Reserva` | `Reservas` | `MontoTotal` es columna calculada (`MontoPaquete+MontoExtras`) — ver `notas.md`. |
| `EstadosReserva` | `EstadosReservas` | Catálogo fijo de 5 nombres, seedeado en `Database/script.sql`: `Pendiente`, `Confirmada`, `EnProceso`, `Completada`, `Cancelada`. |
| `HistorialEstadosReserva` | `HistorialEstadosReservas` | Una fila por cada cambio de `IdEstado`, incluida la creación (`IdEstadoAnterior = null`). |
| `DetallesReservaExtra` | `DetallesReservaExtras` | Ítems de inventario (`ItemsExtra`, del módulo `inventario`) consumidos por la reserva, con precio congelado. `Subtotal` es columna calculada. |
| `ExencionesResponsabilidad` | `ExencionesResponsabilidad` | FK 1:1 única a `Reserva`. Ningún código de este módulo la lee ni la escribe — ver `notas.md`. |

Reutiliza `Usuario` (módulo `usuarios`), `Sala` (módulo `salas`),
`Paquete` (módulo `paquetes`) e `ItemsExtra` (módulo `inventario`) como
referencias, no las posee.

## Endpoints

| Método | Path | Auth | Input | Output |
|---|---|---|---|---|
| POST | `/api/reservas` | Cualquier autenticado | `CrearReservaDTO` | `201` + `ReservaDetalleDTO` |
| GET | `/api/reservas/{id}` | Cualquier autenticado | — | `200` + `ReservaDetalleDTO` |
| GET | `/api/reservas?estado=` | Cualquier autenticado | `estado?: string` | `200` + `List<ReservaDetalleDTO>` |
| PUT | `/api/reservas/{id}/estado` | Cualquier autenticado | `CambiarEstadoReservaDTO` | `200` + `ReservaDetalleDTO` |
| GET | `/api/reservas/{id}/historial` | `Admin`, `Staff` | — | `200` + `List<HistorialEstadoDTO>` |

Autorización fina (quién puede operar sobre *cuál* reserva, y qué
transición de estado requiere qué rol) se resuelve dentro de
`ReservaService`, no en atributos del controller — ver `flujo.md`.
