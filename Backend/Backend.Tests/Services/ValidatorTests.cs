using Backend.DTOs;
using Backend.Validators;

namespace Backend.Tests.Services;

public class ValidatorTests
{
    private static RegistroDTO Valido() => new()
        { Nombre = "Ana", Apellido = "G", Email = "ana@x.com", Password = "Password1!" };

    [Fact] public void Registro_Valido_Pasa() => Assert.True(new RegistroValidator().Validate(Valido()).IsValid);

    [Theory]
    [InlineData("corta1A")]
    [InlineData("sinnumeros")]
    [InlineData("SINMINUSCULA1")]
    public void Registro_PasswordDebil_Falla(string pwd)
    {
        var dto = Valido();
        dto.Password = pwd;
        Assert.False(new RegistroValidator().Validate(dto).IsValid);
    }

    [Fact]
    public void Registro_EmailInvalido_Falla()
    {
        var dto = Valido();
        dto.Email = "no-es-email";
        Assert.False(new RegistroValidator().Validate(dto).IsValid);
    }
}
