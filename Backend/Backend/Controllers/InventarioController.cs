using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/inventario")]
public class InventarioController(IInventarioService inventario) : ControllerBase
{
    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<List<ItemExtraDTO>>> Listar([FromQuery] string? categoria, [FromQuery] bool? activo) =>
        await inventario.ListarAsync(categoria, activo);

    [HttpGet("{id:int}"), AllowAnonymous]
    public async Task<ActionResult<ItemExtraDTO>> Obtener(int id) => await inventario.ObtenerAsync(id);

    [HttpPost]
    public async Task<ActionResult<ItemExtraDTO>> Crear(CrearItemExtraDTO dto)
    {
        var creado = await inventario.CrearAsync(dto);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ItemExtraDTO>> Actualizar(int id, ActualizarItemExtraDTO dto) => await inventario.ActualizarAsync(id, dto);

    [HttpPut("{id:int}/estado")]
    public async Task<ActionResult<ItemExtraDTO>> CambiarEstado(int id, CambiarEstadoDTO dto) => await inventario.CambiarEstadoAsync(id, dto.Activo);
}
