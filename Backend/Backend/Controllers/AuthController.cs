using Backend.DTOs;
using Backend.Infrastructure;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("registro")]
    [AllowAnonymous]
    public async Task<ActionResult<UsuarioDTO>> Registro(RegistroDTO dto)
    {
        var usuario = await auth.RegistrarAsync(dto);
        return Created("/api/usuarios/me", usuario);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginRespuestaDTO>> Login(LoginDTO dto) => await auth.LoginAsync(dto);

    /// <summary>El frontend lo invoca cada ~60 s para marcar al usuario como online.</summary>
    [HttpPost("heartbeat")]
    [Authorize]
    public async Task<IActionResult> Heartbeat()
    {
        await auth.HeartbeatAsync(User.GetUserId());
        return NoContent();
    }
}
