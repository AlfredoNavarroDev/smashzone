# Flujo — reportes

Los 3 métodos de `ReportesService` siguen la misma forma: validar rango →
filtrar `IQueryable` → agrupar/proyectar a DTO → ordenar en memoria.

## `IngresosPorMesAsync` (`Services/ReportesService.cs:17`)

1. `ValidarRango(desde, hasta)` — ver `validacion.md`.
2. Filtra `db.Pagos` por `Exitoso == true` (pagos fallidos/rechazados no
   son ingreso real, no se suman).
3. Si `desde` viene: `FechaPago >= desde`.
4. Si `hasta` viene: `FechaPago < FinDeRango(hasta)` — ver nota UTC/fin de
   rango abajo.
5. Proyecta `{ Anio, Mes, Monto }` desde `FechaPago.Value.Year/Month`,
   agrupa por `(Anio, Mes)`, suma `Monto` → `IngresoMesDTO`.
6. Ordena en memoria por `Anio, Mes` ascendente (el `GroupBy` de EF no
   garantiza orden, por eso el `OrderBy` final se hace en la lista ya
   materializada, no en el `IQueryable`).

## `PaqueteMasDemandadoAsync` (`Services/ReportesService.cs:34`)

1. `ValidarRango`.
2. `ReservasNoCanceladas(desde, hasta)` (helper compartido, ver abajo) —
   filtra por `Reserva.FechaHoraInicio`, no por `Pago.FechaPago`.
3. Agrupa por `(IdPaquete, Nombre)` vía `IdPaqueteNavigation.Nombre`,
   cuenta reservas → `PaqueteDemandaDTO`.
4. Ordena desc por `TotalReservas` en memoria. Devuelve el ranking
   **completo**, no solo el top 1.

## `HorasPicoAsync` (`Services/ReportesService.cs:45`)

1. `ValidarRango`.
2. `ReservasNoCanceladas(desde, hasta)`.
3. Agrupa por `FechaHoraInicio.Hour` (0–23) → `HoraPicoDTO`.
4. Ordena desc por `TotalReservas` en memoria.

## Helper `ReservasNoCanceladas` (`Services/ReportesService.cs:56`)

Centraliza el filtro común a `paquete-mas-demandado` y `horas-pico`:
`db.Reservas.AsNoTracking().Where(r => r.IdEstadoNavigation.Nombre !=
ReservaService.EstadoCancelada)`, más `desde`/`hasta` sobre
`FechaHoraInicio` con el mismo `FinDeRango` de abajo. Usa la constante
pública `ReservaService.EstadoCancelada` (ver unidad `reservas`) en vez de
repetir el string literal — si esa constante cambia de valor, los 3
reportes (en realidad 2, este helper lo usan 2 de los 3) cambian de
comportamiento automáticamente.

## `hasta` siempre es fin de día completo — `FinDeRango` (línea 70)

```csharp
private static DateTime FinDeRango(DateTime hasta) => hasta.Date.AddDays(1);
```

El servidor **ignora la hora** que venga en `hasta` y filtra con `<
hasta.Date.AddDays(1)` — es decir, cubre el día completo de `hasta`
(00:00:00.000 a 23:59:59.999), sin importar si el caller mandó
`2026-01-15T10:00:00` o `2026-01-15T23:59:59`. Esto es intencional (ver
`docs/api-contracts.md`, sección Bloque 4) y está cubierto por tests
(`IngresosPorMes_HastaEsFechaSola_IncluyeTodoEseDia`,
`PaqueteMasDemandado_HastaEsFechaSola_IncluyeTodoEseDia`).

## Zona horaria

Las fechas (`desde`, `hasta`, y el campo `Hora` de `horas-pico`) se tratan
en UTC crudo — ni el servicio ni el controller hacen conversión de zona
horaria. Si el frontend necesita hora local, la conversión es
responsabilidad suya.

## Series dispersas

Los 3 reportes solo devuelven grupos con datos — un mes, hora o paquete
sin actividad en el rango simplemente no aparece en la lista (no viene con
total `0`). Si el frontend grafica un eje continuo (p. ej. las 24 horas
del día), tiene que rellenar los huecos.
