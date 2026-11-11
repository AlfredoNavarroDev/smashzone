using Backend.DTOs;
using Backend.Infrastructure;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/reservas")]
public class ReservasController(IReservaService reservas) : ControllerBase
{
    private bool EsStaffOAdmin => User.IsInRole("Staff") || User.IsInRole("Admin");

    [HttpPost]
    public async Task<ActionResult<ReservaDetalleDTO>> Crear(CrearReservaDTO dto)
    {
        var creada = await reservas.CrearAsync(dto, User.GetUserId(), EsStaffOAdmin);
        return CreatedAtAction(nameof(Obtener), new { id = creada.Id }, creada);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReservaDetalleDTO>> Obtener(Guid id) =>
        await reservas.ObtenerAsync(id, User.GetUserId(), EsStaffOAdmin);

    [HttpGet]
    public async Task<ActionResult<List<ReservaDetalleDTO>>> Listar([FromQuery] string? estado) =>
        await reservas.ListarAsync(User.GetUserId(), EsStaffOAdmin, estado);

    [HttpPut("{id:guid}/estado")]
    public async Task<ActionResult<ReservaDetalleDTO>> CambiarEstado(Guid id, CambiarEstadoReservaDTO dto) =>
        await reservas.CambiarEstadoAsync(id, dto.NuevoEstado, User.GetUserId(), EsStaffOAdmin);

    [HttpGet("{id:guid}/historial")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<List<HistorialEstadoDTO>>> Historial(Guid id) => await reservas.HistorialAsync(id);
}
