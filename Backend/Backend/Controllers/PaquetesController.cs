using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/paquetes")]
public class PaquetesController(IPaqueteService paquetes) : ControllerBase
{
    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<List<PaqueteDTO>>> Listar([FromQuery] bool? activo) => await paquetes.ListarAsync(activo);

    [HttpGet("{id:int}"), AllowAnonymous]
    public async Task<ActionResult<PaqueteDTO>> Obtener(int id) => await paquetes.ObtenerAsync(id);

    [HttpPost]
    public async Task<ActionResult<PaqueteDTO>> Crear(CrearPaqueteDTO dto)
    {
        var creado = await paquetes.CrearAsync(dto);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PaqueteDTO>> Actualizar(int id, ActualizarPaqueteDTO dto) => await paquetes.ActualizarAsync(id, dto);

    [HttpPut("{id:int}/estado")]
    public async Task<ActionResult<PaqueteDTO>> CambiarEstado(int id, CambiarEstadoDTO dto) => await paquetes.CambiarEstadoAsync(id, dto.Activo);
}
