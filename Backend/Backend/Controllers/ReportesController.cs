using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/reportes")]
public class ReportesController(IReportesService reportes) : ControllerBase
{
    [HttpGet("ingresos-por-mes")]
    public async Task<ActionResult<List<IngresoMesDTO>>> IngresosPorMes([FromQuery] DateTime? desde, [FromQuery] DateTime? hasta) =>
        await reportes.IngresosPorMesAsync(desde, hasta);

    [HttpGet("paquete-mas-demandado")]
    public async Task<ActionResult<List<PaqueteDemandaDTO>>> PaqueteMasDemandado([FromQuery] DateTime? desde, [FromQuery] DateTime? hasta) =>
        await reportes.PaqueteMasDemandadoAsync(desde, hasta);

    [HttpGet("horas-pico")]
    public async Task<ActionResult<List<HoraPicoDTO>>> HorasPico([FromQuery] DateTime? desde, [FromQuery] DateTime? hasta) =>
        await reportes.HorasPicoAsync(desde, hasta);
}
