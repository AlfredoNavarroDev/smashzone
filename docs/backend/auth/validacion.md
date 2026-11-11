# Validación — auth

| Field | Rules |
|---|---|
| `RegistroDTO.Nombre` | No vacío, máx. 100 |
| `RegistroDTO.Apellido` | No vacío, máx. 100 |
| `RegistroDTO.Email` | No vacío, formato email, máx. 150 (unicidad se valida en el service, no aquí — ver `flujo.md`) |
| `RegistroDTO.Password` | `PasswordRules.PasswordSegura`: no vacío, 8–100 caracteres, al menos una minúscula, una mayúscula y un dígito. **Sin exigencia de carácter especial.** |
| `RegistroDTO.Telefono` | Opcional, máx. 20 — sin validación de formato (acepta cualquier string) |
| `RegistroDTO.DocumentoIdentidad` | Opcional, máx. 20 — sin validación de formato |
| `LoginDTO.Email` | Solo no-vacío — no valida formato de email en login (si lo tuviera mal formado, simplemente no matchea ningún registro → 401 genérico) |
| `LoginDTO.Password` | Solo no-vacío |

`PasswordRules.PasswordSegura` (`Validators.cs:6`) se reutiliza también en
`CambiarPasswordValidator` del unit `usuarios` — mismo criterio de fuerza
en ambos puntos de entrada de password.
