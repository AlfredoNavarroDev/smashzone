# Validación — salas

`CrearSalaValidator` / `ActualizarSalaValidator` (idénticos,
`CatalogoValidators.cs:6-24`):

| Field | Rules |
|---|---|
| `Nombre` | `NotEmpty`, `MaximumLength(100)` |
| `CapacidadMaxima` | `GreaterThan(0)` |
| `Descripcion` | `MaximumLength(500)` (nullable, sin `NotEmpty`) |

Unicidad de `Nombre` **no** está en el validator — es una regla de
negocio (`ConflictoException` 409) ejecutada en el service, no una regla
de FluentValidation (400). Un nombre duplicado nunca llega a `400`, llega
a `409`.
