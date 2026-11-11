# Tests — reportes

**`Backend.Tests/Services/ReportesServiceTests.cs`** (unitarios, xUnit +
`TestDb`):
- `IngresosPorMes_SoloExitosos_SumaPorMes` — pagos `Exitoso=false` no se
  suman; agrupa correctamente por año-mes con pagos en meses distintos.
- `IngresosPorMes_FiltraPorRangoFechas` — un pago fuera del rango
  `desde`/`hasta` queda excluido del total.
- `IngresosPorMes_DesdeMayorQueHasta_LanzaReglaNegocio`.
- `IngresosPorMes_HastaEsFechaSola_IncluyeTodoEseDia` — pago a las 23:30
  del día límite sigue incluido pasando solo `hasta=<esa fecha>` sin hora.
- `PaqueteMasDemandado_ExcluyeCanceladasYOrdenaDesc` — una reserva
  `Cancelada` no cuenta; dos paquetes ordenados desc por conteo.
- `PaqueteMasDemandado_DesdeMayorQueHasta_LanzaReglaNegocio`.
- `PaqueteMasDemandado_HastaEsFechaSola_IncluyeTodoEseDia`.
- `HorasPico_ExcluyeCanceladasYAgrupaPorHora` — agrupa por hora exacta
  (18:00 y 18:30 caen en la misma hora `18`); reserva cancelada excluida.
- `HorasPico_DesdeMayorQueHasta_LanzaReglaNegocio`.

Nota: no hay un test unitario de `HorasPico` con el límite `hasta` de fin
de día (sí lo hay para los otros dos reportes) — cubierto indirectamente
porque usa el mismo helper `ReservasNoCanceladas`/`FinDeRango` que
`PaqueteMasDemandado`, pero no hay un caso explícito nombrado para
`horas-pico`. Ver `notas.md`.

**`Backend.Tests/Integration/ReportesEndpointsTests.cs`** (`IClassFixture<ApiFactory>`):
- `GetIngresosPorMes_SinToken_Da401`.
- `GetIngresosPorMes_ComoCliente_Da403` — rol Cliente autenticado no
  tiene acceso.
- `GetReportes_ComoAdmin_Da200EnLosTres` — happy path en los 3 endpoints
  con token Admin; no vuelve a probar reglas de agregación a nivel HTTP
  (esas ya están cubiertas por los unitarios).
