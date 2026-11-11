# Validación — paquetes

`CrearPaqueteValidator` / `ActualizarPaqueteValidator` (idénticos en
reglas, `Validators/CatalogoValidators.cs`):

| Campo | Reglas |
|---|---|
| `Nombre` | `NotEmpty`, `MaximumLength(100)` |
| `Descripcion` | `NotEmpty`, `MaximumLength(1000)` |
| `Precio` | `GreaterThan(0)` |
| `DuracionMinutos` | `GreaterThan(0)` |
| `MaxParticipantes` | `GreaterThanOrEqualTo(1)` |
| `CantidadItemsEstandar` | `GreaterThanOrEqualTo(0)` |

Ejecutados automáticamente por `FluentValidationFilter` antes de llegar al
controller — un `400` de FluentValidation nunca llega al service.

Validación propia del service (no FluentValidation, inline):
nombre único, case-sensitive en la comparación C# (`p.Nombre == n`,
`PaqueteService.cs:72`) — la sensibilidad real a mayúsculas depende de la
collation de la columna en SQL Server, no verificada en este código (ver
`notas.md`).

Nota: `Descripcion` tiene `MaximumLength(1000)` en el validador pero la
columna DB no define un `HasMaxLength` explícito (solo `Nombre` lo tiene,
100 en ambos lados) — el límite de 1000 es solo app-side.
