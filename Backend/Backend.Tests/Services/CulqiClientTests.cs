using System.Net;
using System.Text;
using Backend.Services;

namespace Backend.Tests.Services;

public class CulqiClientTests
{
    private static HttpClient ClienteCon(HttpStatusCode status, string jsonBody) =>
        new(new FakeHandler(status, jsonBody)) { BaseAddress = new Uri("https://api.culqi.com/v2/") };

    [Fact]
    public async Task CrearCargo_Aprobado_DevuelveExitosoConReferencia()
    {
        var http = ClienteCon(HttpStatusCode.OK, """{ "id": "chr_test_1" }""");
        var sut = new CulqiClient(http);
        var r = await sut.CrearCargoAsync("tkn_1", 10000, "a@x.com");
        Assert.True(r.Exitoso);
        Assert.Equal("chr_test_1", r.ReferenciaCargo);
    }

    [Fact]
    public async Task CrearCargo_Rechazado_DevuelveNoExitosoConMensaje()
    {
        var http = ClienteCon(HttpStatusCode.PaymentRequired, """{ "user_message": "Tarjeta rechazada por el banco." }""");
        var sut = new CulqiClient(http);
        var r = await sut.CrearCargoAsync("tkn_2", 10000, "a@x.com");
        Assert.False(r.Exitoso);
        Assert.Equal("Tarjeta rechazada por el banco.", r.MensajeUsuario);
    }

    [Fact]
    public async Task CrearCargo_ErrorInfraestructura_Lanza()
    {
        var http = ClienteCon(HttpStatusCode.InternalServerError, "{}");
        var sut = new CulqiClient(http);
        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.CrearCargoAsync("tkn_3", 10000, "a@x.com"));
    }

    /// <summary>Una API key mala es un fallo de configuración, no un rechazo de tarjeta.</summary>
    [Fact]
    public async Task CrearCargo_ErrorDeAutenticacion_Lanza()
    {
        var http = ClienteCon(HttpStatusCode.Unauthorized, """{ "user_message": "No autorizado." }""");
        var sut = new CulqiClient(http);
        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.CrearCargoAsync("tkn_4", 10000, "a@x.com"));
    }

    [Fact]
    public async Task CrearCargo_RequestMalFormado_Lanza()
    {
        var http = ClienteCon(HttpStatusCode.BadRequest, """{ "user_message": "Parámetro inválido." }""");
        var sut = new CulqiClient(http);
        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.CrearCargoAsync("tkn_5", 10000, "a@x.com"));
    }

    private class FakeHandler(HttpStatusCode status, string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") });
    }
}
