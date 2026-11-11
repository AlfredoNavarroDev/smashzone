# Validación — reportes

| Campo | Reglas |
|---|---|
| `desde` | `DateTime?` opcional, sin formato propio más allá del binding estándar de ASP.NET para query params. |
| `hasta` | Igual que `desde`. La hora que incluya se ignora al filtrar (ver `flujo.md`, `FinDeRango`). |
| `desde` vs `hasta` | Si ambos vienen y `desde > hasta`: `ReglaNegocioException` → `400` (vía `ExcepcionesMiddleware`). Validación inline en `ValidarRango` (`Services/ReportesService.cs:64`), repetida al inicio de los 3 métodos — no hay un DTO de request compartido que la centralice (decisión documentada en el spec de diseño, sección 6: "aceptable pero no obligatorio" extraer a helper — y de hecho sí se extrajo a `ValidarRango` como helper privado, solo que se sigue llamando 3 veces). |

No hay validación de que `desde`/`hasta` sean fechas "razonables" (p. ej.
no hay límite inferior/superior, acepta cualquier `DateTime` válido
incluyendo fechas muy en el pasado o futuro) — no es un bug, es consulta
de agregación de solo lectura, un rango absurdo simplemente devuelve lista
vacía o completa.
