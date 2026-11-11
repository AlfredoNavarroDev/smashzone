# Tests — usuarios

`Backend.Tests/Services/UsuarioServiceTests.cs`:
- `ObtenerPerfil_NoExponePerfilHash`: confirma que `UsuarioDTO` no
  tiene ninguna propiedad con "Password" en el nombre (chequeo
  estructural por reflexión, no solo de valor).
- `ActualizarPerfil_CambiaDatosEditables`: nombre/apellido/teléfono se
  reflejan en el DTO devuelto.
- `CambiarPassword_Correcta_ActualizaHash`: tras el cambio, el nuevo
  hash verifica contra la nueva contraseña.
- `CambiarPassword_ActualIncorrecta_LanzaReglaNegocio`: contraseña
  actual mala → `ReglaNegocioException`.

`Backend.Tests/Integration/AuthEndpointsTests.cs`:
- `Me_DevuelvePerfilDelToken`: con token de un usuario autenticado,
  `GET /api/usuarios/me` devuelve su propio email. Único caso de
  integración para este módulo — no hay test HTTP para `PUT me` ni
  `PUT me/password` (cubiertos solo a nivel de servicio).
