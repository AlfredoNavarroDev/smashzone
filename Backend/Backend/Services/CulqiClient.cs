using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Backend.Services;

public record ResultadoCargoCulqi(bool Exitoso, string? ReferenciaCargo, string? MensajeUsuario);

public interface ICulqiClient
{
    Task<ResultadoCargoCulqi> CrearCargoAsync(string token, int montoCentimos, string email);
}

public class CulqiClient(HttpClient http) : ICulqiClient
{
    public async Task<ResultadoCargoCulqi> CrearCargoAsync(string token, int montoCentimos, string email)
    {
        var body = new { amount = montoCentimos, currency_code = "PEN", email, source_id = token };
        var respuesta = await http.PostAsJsonAsync("charges", body);

        if (respuesta.IsSuccessStatusCode)
        {
            var cargo = await respuesta.Content.ReadFromJsonAsync<CulqiCargoRespuesta>();
            return new ResultadoCargoCulqi(true, cargo?.Id, null);
        }

        // Solo 402 es un rechazo de tarjeta en Culqi. El resto de 4xx (401 key inválida,
        // 404 endpoint equivocado, 422 request mal formado) son fallos de configuración:
        // reportarlos como "tarjeta rechazada" mentiría al cliente y ensuciaría Pagos.
        if (respuesta.StatusCode == HttpStatusCode.PaymentRequired)
        {
            var error = await respuesta.Content.ReadFromJsonAsync<CulqiErrorRespuesta>();
            return new ResultadoCargoCulqi(false, null, error?.UserMessage ?? "El pago fue rechazado por la pasarela.");
        }

        throw new InvalidOperationException($"Culqi respondió con un error inesperado ({(int)respuesta.StatusCode}).");
    }

    private class CulqiCargoRespuesta { [JsonPropertyName("id")] public string? Id { get; set; } }
    private class CulqiErrorRespuesta { [JsonPropertyName("user_message")] public string? UserMessage { get; set; } }
}
