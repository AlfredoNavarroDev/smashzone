# Validación — admin-usuarios

Ningún DTO de este módulo tiene un `AbstractValidator<T>` registrado —
`FluentValidationFilter` no hace nada aquí porque no hay validador para
`FiltroUsuariosDTO`, `CambiarRolDTO` ni `CambiarEstadoDTO` (comparar con
`auth`/`reservas`, que sí tienen validators en `Backend/Validators/`).
Las únicas reglas son las de negocio en `flujo.md`
(auto-protección de rol/estado) más el clamp manual de paginación en
`AdminUsuarioService.ListarAsync` (`Math.Max`/`Math.Clamp`, no lanza
error, ajusta el valor).

`CambiarRolDTO.IdRol` y `CambiarEstadoDTO.Activo` no tienen rango/formato
validado más allá de los tipos de C# — un `IdRol` inexistente solo falla
porque el servicio lo busca explícitamente (`db.Roles.FindAsync` →
`NoEncontradoException`), no por una regla de validación declarada.
