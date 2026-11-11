# Dudas recurrentes — usuarios

**P: ¿Por qué `PUT /api/usuarios/me` no permite cambiar el email?**
R: `UsuarioService.ActualizarPerfilAsync` solo escribe `Nombre`,
`Apellido` y `Telefono` (`Services/UsuarioService.cs:24-32`);
`ActualizarPerfilDTO` ni siquiera tiene un campo `Email`
(`DTOs/AuthDTOs.cs:40-45`). No existe otro endpoint que lo permita.

**P: Si mando la contraseña actual mal en `PUT me/password`, ¿qué código devuelve?**
R: 400 (`ReglaNegocioException`), no 401 —
`Services/UsuarioService.cs:38-40`. El usuario ya pasó la
autenticación por token; esto se trata como una regla de negocio del
cambio de contraseña, no como un fallo de login.

**P: ¿Puedo verme el perfil de otro usuario cambiando el id en la URL?**
R: No — ninguno de los 3 endpoints recibe un id como parámetro; todos
usan `User.GetUserId()` extraído del claim `sub` del token
(`Controllers/UsuariosController.cs:15,18-19,24`,
`Infrastructure/Infrastructure.cs:12-16`).
