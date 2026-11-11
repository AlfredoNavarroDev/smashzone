# pagos

Registra el pago de una reserva ya creada (Bloque 3). Cobra con tarjeta vía
Culqi o registra un pago manual (Efectivo/Transferencia) hecho por
Staff/Admin. Un pago exitoso confirma la reserva en la misma operación —
este módulo es el único punto donde `Pendiente → Confirmada` ocurre.

**Files:** `Controllers/PagosController.cs`, `Services/PagoService.cs`,
`Services/CulqiClient.cs`, `DTOs/PagoDTOs.cs`,
`Validators/PagoValidators.cs`, `Models/Pago.cs`, `Models/MetodosPago.cs`,
`Configuration/CulqiSettings.cs`.

## Entidades / Tablas

| Entidad | Tabla | Notas |
|---|---|---|
| `Pago` | `Pagos` | FK a `Reservas` y `MetodosPago`. `Monto` tiene `CHECK (Monto > 0)` a nivel de base de datos (`Database/script.sql:162`) — **no** declarado en el `DbContext` (scaffold database-first no lo refleja como `HasCheckConstraint`); la única barrera visible en código C# es la validación manual en `PagoService.CrearAsync`. |
| `MetodosPago` | `MetodosPago` | Catálogo simple (`Id`, `Nombre` único). Seedeado con al menos `"Tarjeta de Crédito/Débito"` y `"Efectivo"` (usados por nombre literal en `PagoService`, ver `dudas-recurrentes.md`). |

Este módulo no define sus propios DTOs de catálogo — reutiliza `Reserva` y
`ReservaService` (constantes de estado) del módulo `reservas`.

## Endpoints / entry points

| Method | Path | Auth | Input | Output |
|---|---|---|---|---|
| POST | `/api/pagos` | Cualquier usuario autenticado (`[Authorize]`, sin rol) | `CrearPagoDTO` | `201` + `VoucherDTO` |

Es el único endpoint del controller. La autorización por rol real
(Cliente dueño vs Staff/Admin) ocurre **dentro** del service, no en el
atributo del controller — ver `flujo.md`.
