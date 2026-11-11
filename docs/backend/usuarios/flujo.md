# Flujo — usuarios

## Identidad: `GetUserId()`

Los 3 endpoints no reciben el id del usuario como parámetro — lo
extraen del token JWT vía `User.GetUserId()`
(`Infrastructure/Infrastructure.cs`), que lee el claim `sub` y lanza
`NoAutorizadoException` (401) si falta o no es un GUID válido. Un
usuario nunca puede operar sobre el perfil de otro mandando un id en el
body o la URL — no existe esa ruta.

## `GET me`

`UsuarioService.ObtenerPerfilAsync` carga el usuario con
`Include(IdRolNavigation)` y lo mapea a `UsuarioDTO` vía AutoMapper
(`Rol` sale de `IdRolNavigation.Nombre`). Si el id del token no
corresponde a ningún usuario, `NoEncontradoException` (404) — caso
borde (usuario borrado después de emitido el token), no cubierto por
test.

## `PUT me`

`ActualizarPerfilAsync` solo escribe `Nombre`, `Apellido` y `Telefono`
sobre la entidad cargada. `Telefono` vacío/espacios se normaliza a
`null`; `Nombre`/`Apellido` se recortan (`Trim()`). **No se puede
cambiar `Email` ni `DocumentoIdentidad` por este endpoint** — no hay
ninguna otra ruta que lo permita tampoco (ver `dudas-recurrentes.md`).

## `PUT me/password`

`CambiarPasswordAsync` verifica `PasswordActual` contra el hash
guardado con `BCrypt.Net.BCrypt.Verify`, envuelto en `try/catch` que
trata cualquier excepción de verificación (ej. hash corrupto/formato
inesperado) como contraseña incorrecta en vez de propagar un 500. Si
no coincide, `ReglaNegocioException` (400) — no 401, pese a ser
esencialmente una re-autenticación fallida (criterio: ya está
autenticado por el token; esto es una regla de negocio del cambio, no
un fallo de login). Si coincide, hashea `PasswordNueva` y guarda. **No
valida que `PasswordNueva` sea distinta de `PasswordActual`** — ver
`notas.md`.
