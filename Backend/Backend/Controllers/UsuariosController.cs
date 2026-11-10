using Backend.DTOs;
using Backend.Infrastructure;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/usuarios")]
public class UsuariosController(IUsuarioService usuarios) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<UsuarioDTO>> Me() => await usuarios.ObtenerPerfilAsync(User.GetUserId());

    [HttpPut("me")]
    public async Task<ActionResult<UsuarioDTO>> ActualizarMe(ActualizarPerfilDTO dto) =>
        await usuarios.ActualizarPerfilAsync(User.GetUserId(), dto);

    [HttpPut("me/password")]
    public async Task<IActionResult> CambiarPassword(CambiarPasswordDTO dto)
    {
        await usuarios.CambiarPasswordAsync(User.GetUserId(), dto);
        return NoContent();
    }
}
