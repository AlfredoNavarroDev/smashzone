# Dudas recurrentes — auth

**P: ¿Por qué login no dice "contraseña incorrecta" vs "usuario no existe"
pero sí dice explícitamente "cuenta deshabilitada"?**
R: Es deliberado para email/password (comentario en `AuthService.cs:56`,
"no revelar si el email existe"), pero la rama de cuenta deshabilitada
(`AuthService.cs:59-60`) usa un mensaje distinto que sí confirma que la
cuenta existe. No hay un tercer caso que lo oculte — es una asimetría real
en el código, no documentación desactualizada.

**P: ¿El heartbeat extiende la sesión o renueva el JWT?**
R: No. Solo actualiza `UltimaActividad` en la fila del usuario
(`AuthService.cs:80`). El JWT sigue su expiración original
(`JwtSettings:ExpirationMinutes`, default 60 min) sin importar cuántos
heartbeats se manden.

**P: ¿Qué pasa si un Admin desactiva a un usuario que ya tiene un JWT
válido y no expirado?**
R: El token sigue siendo válido criptográficamente (nada lo revoca), pero
cualquier llamada a `/api/auth/heartbeat` le devuelve 401
(`AuthService.cs:78-79` revisa `Activo` en cada heartbeat). Otros
endpoints que no pasan por `AuthService` no hacen este re-chequeo — solo
dependen de que el JWT sea válido y no esté expirado (ver `notas.md`).

**P: ¿Por qué `RegistroDTO.Password` no exige un carácter especial?**
R: No lo exige — `PasswordRules.PasswordSegura` (`Validators.cs:6-14`)
solo pide longitud 8-100, una minúscula, una mayúscula y un dígito.
