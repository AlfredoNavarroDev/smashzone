# Validación — usuarios

Vía `FluentValidationFilter` (global, corre antes del action).

## `ActualizarPerfilDTO` (`ActualizarPerfilValidator`)

| Campo | Reglas |
|---|---|
| `Nombre` | No vacío, máx. 100 |
| `Apellido` | No vacío, máx. 100 |
| `Telefono` | Máx. 20 (nullable, sin regla de formato) |

## `CambiarPasswordDTO` (`CambiarPasswordValidator`)

| Campo | Reglas |
|---|---|
| `PasswordActual` | No vacío (el contenido real se valida en el service contra el hash, no aquí) |
| `PasswordNueva` | `PasswordSegura()`: no vacío, 8–100 caracteres, al menos una minúscula, una mayúscula y un número |

No hay regla que exija `PasswordNueva != PasswordActual` ni en el
validator ni en el service.
