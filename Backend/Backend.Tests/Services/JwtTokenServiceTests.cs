using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Services;

public class JwtTokenServiceTests
{
    [Fact]
    public void Generar_IncluyeClaimsDeIdEmailYRol_ConExpiracion()
    {
        using var t = new TestDb();
        t.AddUsuario("admin@correo.com", rol: 1);
        var u = t.Db.Usuarios.Include(x => x.IdRolNavigation).Single();

        var token = new JwtTokenService(TestDb.JwtOptions, t.Time).Generar(u);

        var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
        var jwt = handler.ReadJwtToken(token);
        Assert.Equal(u.Id.ToString(), jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
        Assert.Equal("admin@correo.com", jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
        Assert.Equal("Admin", jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value);
        Assert.Equal(t.Time.Now.UtcDateTime.AddMinutes(60), jwt.ValidTo, TimeSpan.FromSeconds(2));
    }
}
