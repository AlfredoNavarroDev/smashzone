using Backend.DTOs;
using Backend.Infrastructure;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminUsuariosController(IAdminUsuarioService admin) : ControllerBase
{
    [HttpGet("usuarios")]
    public async Task<ActionResult<PaginadoDTO<AdminUsuarioDTO>>> Listar([FromQuery] FiltroUsuariosDTO filtro) =>
        await admin.ListarAsync(filtro);

    [HttpGet("usuarios/resumen")]
    public async Task<ActionResult<UsuariosResumenDTO>> Resumen() => await admin.ResumenAsync();

    [HttpGet("usuarios/{id:guid}")]
    public async Task<ActionResult<AdminUsuarioDTO>> Obtener(Guid id) => await admin.ObtenerAsync(id);

    [HttpPut("usuarios/{id:guid}/rol")]
    public async Task<ActionResult<AdminUsuarioDTO>> CambiarRol(Guid id, CambiarRolDTO dto) =>
        await admin.CambiarRolAsync(id, dto.IdRol, User.GetUserId());

    [HttpPut("usuarios/{id:guid}/estado")]
    public async Task<ActionResult<AdminUsuarioDTO>> CambiarEstado(Guid id, CambiarEstadoDTO dto) =>
        await admin.CambiarEstadoAsync(id, dto.Activo, User.GetUserId());

    [HttpGet("roles")]
    public async Task<ActionResult<List<RolDTO>>> Roles() => await admin.ListarRolesAsync();
}
