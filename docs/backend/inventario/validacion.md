# Validación — Inventario

`CrearItemExtraValidator` / `ActualizarItemExtraValidator`
(`Validators/CatalogoValidators.cs`) — mismas reglas en ambos:

| Campo | Reglas |
|---|---|
| `Nombre` | `NotEmpty`, máx. 100 caracteres |
| `Categoria` | `NotEmpty`, máx. 50 caracteres |
| `PrecioUnitario` | `>= 0` |
| `StockDisponible` | `>= 0` |

Unicidad de `Nombre` **no** la valida FluentValidation — es una regla de
negocio (`ValidarNombreUnico` en el service) que lanza `ConflictoException`
(409), no 400. La tabla también tiene constraint único
(`UQ__ItemsExt__75E3EFCFA000350D`) como respaldo a nivel de esquema.

`DescontarStockAsync`/`ReponerStockAsync` no pasan por
`FluentValidationFilter` (no son endpoints HTTP) — su validación de
`cantidad > 0` y stock suficiente es manual, inline en el service.
