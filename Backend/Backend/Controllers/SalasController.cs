using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/salas")]
public class SalasController(ISalaService salas) : ControllerBase
{
    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<List<SalaDTO>>> Listar([FromQuery] bool? activa) => await salas.ListarAsync(activa);

    [HttpGet("{id:int}"), AllowAnonymous]
    public async Task<ActionResult<SalaDTO>> Obtener(int id) => await salas.ObtenerAsync(id);

    [HttpPost]
    public async Task<ActionResult<SalaDTO>> Crear(CrearSalaDTO dto)
    {
        var creada = await salas.CrearAsync(dto);
        return CreatedAtAction(nameof(Obtener), new { id = creada.Id }, creada);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<SalaDTO>> Actualizar(int id, ActualizarSalaDTO dto) => await salas.ActualizarAsync(id, dto);

    [HttpPut("{id:int}/estado")]
    public async Task<ActionResult<SalaDTO>> CambiarEstado(int id, CambiarEstadoDTO dto) => await salas.CambiarEstadoAsync(id, dto.Activo);
}
