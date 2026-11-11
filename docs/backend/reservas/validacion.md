# Validación — reservas

FluentValidation (`Validators/ReservaValidators.cs`), ejecutada por
`FluentValidationFilter` antes de que el action corra.

| DTO.Campo | Reglas |
|---|---|
| `CrearReservaDTO.IdSala` | `GreaterThan(0)` — no valida que exista; eso lo hace `ReservaService` (404/400, ver `flujo.md`). |
| `CrearReservaDTO.IdPaquete` | `GreaterThan(0)` — idem. |
| `CrearReservaDTO.NumParticipantes` | `GreaterThan(0)` — el tope real (capacidad de sala/paquete) lo valida el service, no aquí. |
| `CrearReservaDTO.NotasEspeciales` | `MaximumLength(500)` — coincide con el `HasMaxLength(500)` de la columna en `SmashZoneDbContext`. |
| `CrearReservaDTO.Extras[].IdItemExtra` | `GreaterThan(0)` por cada elemento (`RuleForEach`). |
| `CrearReservaDTO.Extras[].Cantidad` | `GreaterThan(0)` por cada elemento. |
| `CambiarEstadoReservaDTO.NuevoEstado` | `NotEmpty()` + `Must(e => e is "Cancelada" or "EnProceso" or "Completada")` — rechaza `"Confirmada"` y cualquier texto libre aquí mismo, en `400`, antes de que la petición llegue al service. |

Nótese que el validator ya excluye `"Confirmada"` como valor aceptable
de `NuevoEstado` — la regla de negocio del service (punto 2 en
`flujo.md`) es una segunda guarda redundante, no la única barrera.

Ningún validator de este módulo exige que `FechaHoraInicio` sea futura
ni que `NumParticipantes` respete la capacidad real de sala/paquete —
esas reglas, con acceso a datos, solo las aplica `ReservaService`.
