# Flujo — paquetes

## `Listar`
Filtra opcionalmente por `activo`, ordena por `Nombre`, proyecta directo a
`PaqueteDTO` vía `ProjectTo` (AutoMapper, sin `Select` manual). Sin
paginación.

## `Obtener`
Carga por `Id` con `SingleOrDefaultAsync`; si no existe,
`NoEncontradoException` (404).

## `Crear`
1. Valida nombre único (`ValidarNombreUnico`, ver `validacion.md`) — lanza
   `ConflictoException` (409) si ya existe.
2. Hace `Trim()` de `Nombre` y `Descripcion` antes de guardar.
3. `Activo` se fuerza a `true` en el DTO de entrada ignorado — el campo no
   viene en `CrearPaqueteDTO`, el service lo fija explícitamente
   (`PaqueteService.cs:37`).
4. `201 Created` con `Location` apuntando a `Obtener`.

## `Actualizar`
Carga (404 si no existe), vuelve a validar nombre único excluyendo el
propio `id`, sobrescribe todos los campos editables. No permite tocar
`Activo` — eso es solo responsabilidad de `CambiarEstado`.

## `CambiarEstado`
Carga (404 si no existe), asigna `Activo` y persiste. No hay restricción
de negocio adicional (ej. no valida si el paquete tiene reservas activas
antes de desactivarlo — desactivar no afecta reservas ya creadas, solo
oculta el paquete del catálogo para nuevas reservas en el frontend).
