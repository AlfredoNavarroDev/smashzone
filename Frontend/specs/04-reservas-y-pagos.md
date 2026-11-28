# Spec 04 — Core Transaccional: Reservas, Prevención de Solapamiento y Pagos Culqi

> **Bloque asociado:** Bloque 3 (`reservas`, `pagos`)  
> **Contratos Backend:** [`../../api-contracts.md#bloque-3--core-transaccional`](../../api-contracts.md), [`../../backend/reservas/flujo.md`](../../backend/reservas/flujo.md) y [`../../backend/pagos/flujo.md`](../../backend/pagos/flujo.md)

---

## 1. Configurador Interactivo de Reserva (`POST /api/reservas`)

### Payload de Entrada (`CrearReservaDTO`)
```ts
interface CrearReservaDTO {
  idSala: number;
  idPaquete: number;
  fechaHoraInicio: string; // ISO-8601 UTC (debe ser futura respecto al reloj del servidor)
  numParticipantes: number;
  notasEspeciales?: string | null;
  idCliente?: string | null; // Opcional solo para Staff/Admin; ignorado si el actor es Cliente
  extras: { idItemExtra: number; cantidad: number }[];
}
```

### Validaciones Preventivas en el Frontend (Espejo de `ReservaService.CrearAsync`)
1. **Sala y Paquete Activos:** Solo permite seleccionar salas con `activa === true` y paquetes con `activo === true`.
2. **Fecha y Hora Futura:** Valida que `new Date(fechaHoraInicio) > new Date()`.
3. **Cálculo Visual de `fechaHoraFin`:** Aunque el cliente **no envía** `fechaHoraFin` al servidor, la interfaz calcula `fechaHoraFin = fechaHoraInicio + paquete.duracionMinutos` y muestra el bloque exacto (ej. `18:00 — 18:45 UTC`) para que el usuario verifique su horario antes de confirmar.
4. **Doble Límite de Participantes:**
   - Si `numParticipantes > sala.capacidadMaxima` → Error específico: *"Supera la capacidad máxima de la sala seleccionada."*
   - Si `numParticipantes > paquete.maxParticipantes` → Error específico: *"Supera el máximo de participantes permitido por el paquete."*
5. **Verificación y Prevención de Solapamiento (`409 Conflict`):**
   - Regla crítica del negocio: Dos reservas no canceladas en la misma `idSala` no pueden cruzarse en el rango `[FechaHoraInicio, FechaHoraFin)`.
   - El frontend muestra visualmente los bloques horarios ya ocupados en la sala elegida y, si el usuario intenta reservar en un rango superpuesto, presenta el alerta de conflicto `409 Conflict` con sugerencia del próximo horario libre.
6. **Congelamiento y Cálculo de Montos:**
   - `montoPaquete = paquete.precio`
   - `montoExtras = Σ (item.precioUnitario * cantidad)`
   - `montoTotal = montoPaquete + montoExtras`

---

## 2. Pasarela de Pago Culqi & Pagos Manuales (`POST /api/pagos`)

Una vez creada la reserva en estado `Pendiente`, se habilita inmediatamente el módulo de pago:

### Modalidad A: Tarjeta de Crédito / Débito vía Culqi (`idMetodoPago: 1`)
- Disponible para `Cliente`, `Staff` y `Admin`.
- **Payload (`CrearPagoDTO`):**
  ```json
  {
    "idReserva": "guid-de-la-reserva",
    "idMetodoPago": 1,
    "culqiToken": "tkn_test_smashzone_99812x"
  }
  ```
- **Nota de Seguridad:** El cliente **jamás envía `monto`** en `POST /api/pagos`; el servidor toma `MontoPaquete + MontoExtras` directamente de la entidad `Reserva`.
- Simulación interactiva en UI: El usuario puede probar tanto un **Token Exitoso (`tkn_live_ok_...`)** como un **Token Rechazado por Culqi (`tkn_test_declined`)** para demostrar en la exposición cómo el sistema registra el intento fallido (`400 Bad Request`) manteniendo la reserva en `Pendiente`, o confirma la reserva (`Pendiente → Confirmada`) emitiendo el `VoucherDTO` (`201 Created`).

### Modalidad B: Pago Manual — Transferencia / Efectivo (`idMetodoPago: 2` o `3`)
- Exclusivo para `Staff` y `Admin` (`400` si lo intenta un `Cliente`).
- **Payload:**
  ```json
  {
    "idReserva": "guid-de-la-reserva",
    "idMetodoPago": 2,
    "exitoso": true,
    "transaccionRef": "OP-BCP-884920"
  }
  ```

### Comprobante Electrónico (`VoucherDTO`)
Al responder `201 Created`, el frontend despliega un **Voucher Industrial Imprimible** con código QR/barras simulado, referencia de transacción (`transaccionRef`), desglose financiero y estado actualizado a `Confirmada`.

---

## 3. Máquina de Estados de Reserva y Auditoría (`PUT /api/reservas/{id}/estado`)

```text
               ┌──(Pago Exitoso vía POST /api/pagos)──► [ Confirmada ] ──(Staff/Admin)──► [ EnProceso ] ──(Staff/Admin)──► [ Completada ]
[ Pendiente ] ─┤                                               │
               └──(Cliente dueño o Staff/Admin)────────────────┴─────────► [ Cancelada ] (Repone stock de extras automáticamente)
```

- **Restricción clave:** `Confirmada` **no** se puede enviar en `PUT /api/reservas/{id}/estado` (devuelve `400`); solo se alcanza pagando en `POST /api/pagos`.
- **Reposición de Stock:** Al pasar a `Cancelada` desde `Pendiente` o `Confirmada`, el stock de todos los `DetallesReservaExtras` vuelve a sumarse en `Inventario`.
- **Línea de Tiempo Auditable (`GET /api/reservas/{id}/historial`):** Exclusivo para `Admin` y `Staff`. Muestra cada transición (`estadoAnterior → estadoNuevo`), la fecha UTC exacta y qué miembro del personal la ejecutó (`idUsuarioCambio` o `Sistema/Cliente` si es `null`).

