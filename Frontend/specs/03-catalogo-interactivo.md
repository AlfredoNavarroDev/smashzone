# Spec 03 — Módulo de Catálogo Interactivo (Salas, Paquetes e Inventario)

> **Bloque asociado:** Bloque 2 (`salas`, `paquetes`, `inventario`)  
> **Contratos Backend:** [`../../api-contracts.md#bloque-2--catálogo`](../../api-contracts.md)

---

## 1. Principios de Diseño y Reglas de Negocio del Catálogo

1. **Lectura Pública (`GET`):** Cualquier visitante (sin necesidad de token JWT) puede explorar Salas, Paquetes e Inventario de Extras en la landing page estilo *KELTIC*.
2. **Mutaciones Protegidas (`POST` / `PUT`):** Solo el rol `Admin` puede crear, editar o cambiar el estado de activación.
3. **Sin Borrado Físico (`NO DELETE`):** Debido a que `Reservas` y `DetallesReservaExtras` referencian estas tablas sin cascada para preservar el historial contable, "eliminar" una Sala, Paquete o Ítem de Inventario se realiza exclusivamente mediante `PUT /api/<recurso>/{id}/estado` con `{ activo: false }`.
4. **Unicidad de Nombre (`409 Conflict`):** Crear o renombrar una Sala, Paquete o Ítem Extra con un nombre ya existente devuelve `409 Conflict`.

---

## 2. Salas de Destrucción (`/api/salas`)

### Estructura `SalaDTO`
```ts
interface SalaDTO {
  id: number;
  nombre: string;
  capacidadMaxima: number;
  descripcion: string | null;
  activa: boolean;
}
```
### Experiencia Visual en la Página (Estilo KELTIC)
- Tarjetas arquitectónicas numeradas (`CHAMBER // 01`, `CHAMBER // 02`) con indicador de capacidad (`MAX 4 PAX`, `MAX 8 PAX`), estado operativo en vivo y botón **"SELECCIONAR CÁMARA"** que inyecta `idSala` directamente en el Wizard de Reserva y desplaza suavemente la vista con `Lenis`.

---

## 3. Paquetes de Furia (`/api/paquetes`)

### Estructura `PaqueteDTO`
```ts
interface PaqueteDTO {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracionMinutos: number;
  maxParticipantes: number;
  cantidadItemsEstandar: number;
  activo: boolean;
}
```
### Experiencia Visual en la Página
- Matriz de planes con estética de armamento industrial.
- Destaca el `precio` en tipografía Display, `duracionMinutos` en reloj técnico, `maxParticipantes` y `cantidadItemsEstandar` (objetos base incluidos en la sesión).
- Al elegir un paquete, el Wizard de Reserva recalcula automáticamente la hora de finalización (`fechaHoraInicio + duracionMinutos`) y el tope de participantes permitidos (`Math.min(sala.capacidadMaxima, paquete.maxParticipantes)`).

---

## 4. Inventario de Ítems Extra (`/api/inventario`)

### Estructura `ItemExtraDTO`
```ts
interface ItemExtraDTO {
  id: number;
  nombre: string;
  categoria: 'Vidrio' | 'Electrodomésticos' | 'Electrónica' | string;
  precioUnitario: number;
  stockDisponible: number;
  activo: boolean;
}
```
### Experiencia Visual en la Página
- Filtros rápidos por pestañas (`TODOS`, `VIDRIO`, `ELECTRODOMÉSTICOS`, `ELECTRÓNICA`).
- Indicador visual de nivel de stock (`stockDisponible` unidades):
  - `> 10`: Verde Voltio (`STOCK ÓPTIMO`)
  - `1–10`: Ámbar (`ÚLTIMAS UNIDADES`)
  - `0`: Carmesí (`AGOTADO` — botón `+` deshabilitado).
- Controles `+` / `-` sincronizados en tiempo real con el configurador de reserva para que el usuario arme su combo de destrucción personalizado.

