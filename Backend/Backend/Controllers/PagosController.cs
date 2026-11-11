using Backend.DTOs;
using Backend.Infrastructure;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/pagos")]
public class PagosController(IPagoService pagos) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<VoucherDTO>> Crear(CrearPagoDTO dto)
    {
        var voucher = await pagos.CrearAsync(dto, User.GetUserId(), User.IsInRole("Staff") || User.IsInRole("Admin"));
        return StatusCode(StatusCodes.Status201Created, voucher);
    }
}
