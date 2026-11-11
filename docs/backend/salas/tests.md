# Tests — salas

**`SalaServiceTests.cs`** (unitario, `TestDb` en memoria):
- `Crear_PersisteYDevuelveDTO` — crea y confirma `Activa = true` por defecto.
- `Crear_NombreDuplicado_LanzaConflicto`.
- `Obtener_NoExistente_LanzaNoEncontrado`.
- `Actualizar_CambiaDatos`.
- `Actualizar_NombreDuplicadoDeOtraSala_LanzaConflicto` — confirma que la
  exclusión por id funciona (no se compara contra sí misma).
- `CambiarEstado_Desactiva`.
- `Listar_FiltraPorActiva`.

**`CatalogoEndpointsTests.cs`** (integración, caso salas):
- `GetSalas_SinToken_Da200` — confirma el `[AllowAnonymous]`.
- `PostSalas_SinToken_Da401`.
- `PostSalas_ComoCliente_Da403_YComoAdmin_Da201` — cubre los tres niveles
  de auth en un solo test.

No hay test de integración para `PUT {id}` ni `PUT {id}/estado` a nivel
HTTP — esas rutas solo están cubiertas por los unitarios del service.
