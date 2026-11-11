# Validación — pagos

`CrearPagoValidator` (FluentValidation, corre vía `FluentValidationFilter`
antes del action):

| Campo | Reglas |
|---|---|
| `IdMetodoPago` | `GreaterThan(0)`. No valida que el id exista — eso lo hace `PagoService` (`404` si no hay match). |
| `TransaccionRef` | `MaximumLength(100)` — espeja `NVARCHAR(100)` de la columna `Pagos.TransaccionRef`; sin este límite un ref más largo rompe el `INSERT` con una excepción no traducida. |

**Todo lo demás es validación de negocio dentro del service, no
FluentValidation** — ningún `RuleFor` cubre:
- Que `CulqiToken` venga cuando el método es tarjeta.
- Que `Exitoso` venga cuando el método es manual.
- Que el actor tenga permiso para confirmar un pago manual.
- Que el monto calculado sea `> 0`.

Esto es deliberado: son reglas que dependen de datos que el validator no
tiene (el método de pago resuelto, el rol del actor, el monto de la
reserva) — ver `flujo.md` para dónde se aplican y con qué excepción.
