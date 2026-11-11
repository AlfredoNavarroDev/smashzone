# Tests — admin-usuarios

`Backend.Tests/Services/AdminUsuarioServiceTests.cs` — unitarios contra
`TestDb`, cubren: conteos de `Resumen` (total/habilitados/online/activos
7d/por rol), serie `RegistrosPorDia` de 30 días con huecos en cero,
filtros combinados de `Listar` (texto, rol, online) y paginación, `
CambiarRol` (éxito, rol inexistente → `NoEncontradoException`, un Admin
no puede quitarse su propio rol, no se puede dejar el sistema sin
Admins), `CambiarEstado` (deshabilitar/habilitar, un Admin no puede
deshabilitarse a sí mismo, usuario inexistente → `NoEncontradoException`),
y `ListarRoles` (devuelve los 3 roles seed).

No hay test unitario para el caso "deshabilitar al último Admin activo
(no el actor mismo)" — sí existe para `CambiarRol` pero no está
replicado explícitamente para `CambiarEstado` con un actor distinto al
Admin objetivo (ver `notas.md`).
