using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Configuration;
using Backend.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services;

public interface IJwtTokenService
{
    string Generar(Usuario usuario);
    DateTime ExpiraEn();
}

public class JwtTokenService(IOptions<JwtSettings> options, TimeProvider time) : IJwtTokenService
{
    private readonly JwtSettings _s = options.Value;

    public DateTime ExpiraEn() => time.GetUtcNow().UtcDateTime.AddMinutes(_s.ExpirationMinutes);

    /// <summary>Requiere que <c>IdRolNavigation</c> esté cargado.</summary>
    public string Generar(Usuario usuario)
    {
        var ahora = time.GetUtcNow().UtcDateTime;
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, usuario.IdRolNavigation.Nombre)
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_s.Secret));
        var token = new JwtSecurityToken(
            _s.Issuer, _s.Audience, claims,
            notBefore: ahora, expires: ahora.AddMinutes(_s.ExpirationMinutes),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
