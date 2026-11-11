# Notas — usuarios

## Dependencias

Consume `Usuario`/`Role` (entidades propiedad del módulo `auth`) y
`UsuarioProfile` (AutoMapper, compartido con `admin-usuarios` y
`auth`). No es consumido por otros módulos.

## Notas

- `CambiarPasswordAsync` no valida que `PasswordNueva` sea distinta de
  `PasswordActual` — un usuario puede "cambiar" su contraseña a la
  misma. No hay test que cubra este caso ni se sabe si es intencional
  (gap abierto, no verificado en código ni en docs existentes).
- `GET me` no tiene test de integración para el caso de usuario
  borrado después de emitido el token (`NoEncontradoException` 404) —
  comportamiento deducido del código, no confirmado por test.
