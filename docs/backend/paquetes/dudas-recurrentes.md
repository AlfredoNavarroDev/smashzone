# Dudas recurrentes — paquetes

**P: ¿`CantidadItemsEstandar` reserva ítems del inventario (`ItemsExtra`)?**
R: No. Es un entero plano en la tabla `Paquetes`
(`Models/Paquete.cs:20`), sin FK ni relación a `ItemsExtra`. El inventario
(`docs/backend/inventario/`) es un módulo independiente; nada en el
código actual descuenta stock de inventario al crear una reserva con un
paquete. Si el dashboard o el frontend asumen que "ítems estándar" sale
del stock de inventario, es una suposición no respaldada por este código.

**P: ¿Se puede borrar un paquete?**
R: No hay endpoint de borrado. El único control de ciclo de vida es
`PUT /api/paquetes/{id}/estado` (`PaquetesController.cs:29-30`), que solo
cambia `Activo` — soft, no borra la fila ni las reservas que lo referencian.

**P: ¿Por qué `Crear`/`Actualizar` no reciben `Activo` en el DTO?**
R: `CrearPaqueteDTO`/`ActualizarPaqueteDTO` no tienen ese campo
(`DTOs/CatalogoDTOs.cs:38-56`) — el service fija `Activo = true` al crear
(`PaqueteService.cs:37`) y lo deja intacto al actualizar; cambiarlo es
responsabilidad exclusiva del endpoint `/estado`.
