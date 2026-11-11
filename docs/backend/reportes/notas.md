# Notas — reportes

## Dependencias

- Lee `Reserva` y `Pago` directamente vía `SmashZoneDbContext` — no pasa
  por `IReservaService`/`IPagoService` (acceso de datos directo, aceptado
  porque es de solo lectura y entre bloques del mismo backend).
- Usa `ReservaService.EstadoCancelada` (constante pública expuesta por la
  unidad `reservas`) en vez de repetir el string `"Cancelada"` — acopla
  este servicio a esa constante permaneciendo pública.
- Ningún otro módulo consume `ReportesService` — es un endpoint terminal
  pensado para el futuro dashboard del Frontend (Bloque 4, pieza aún no
  construida).

## Notas

- No hay test unitario explícito para el límite `hasta` de fin de día en
  `HorasPicoAsync` (sí para los otros dos reportes) — mismo código
  (`ReservasNoCanceladas`/`FinDeRango`), solo falta el caso nombrado. Gap
  menor, no bug conocido.
- Sin paginación ni límite de resultados en ninguno de los 3 endpoints —
  aceptable mientras el volumen de meses/paquetes/horas sea chico (horas
  pico está acotado a 24 grupos como máximo por diseño).
- Fuera de alcance explícito (spec de diseño, sección "Fuera de
  alcance"): dashboard visual, shell de Frontend, y cualquier reporte no
  pedido (por sala, por cliente) — YAGNI, no implementado.
