using Backend.DTOs;
using FluentValidation;

namespace Backend.Validators;

public static class PasswordRules
{
    public static IRuleBuilderOptions<T, string> PasswordSegura<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty()
            .MinimumLength(8).WithMessage("La contraseña debe tener al menos 8 caracteres.")
            .MaximumLength(100)
            .Matches("[a-z]").WithMessage("La contraseña debe incluir una minúscula.")
            .Matches("[A-Z]").WithMessage("La contraseña debe incluir una mayúscula.")
            .Matches("[0-9]").WithMessage("La contraseña debe incluir un número.");
}

public class RegistroValidator : AbstractValidator<RegistroDTO>
{
    public RegistroValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Apellido).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(150);
        RuleFor(x => x.Password).PasswordSegura();
        RuleFor(x => x.Telefono).MaximumLength(20);
        RuleFor(x => x.DocumentoIdentidad).MaximumLength(20);
    }
}

public class LoginValidator : AbstractValidator<LoginDTO>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class ActualizarPerfilValidator : AbstractValidator<ActualizarPerfilDTO>
{
    public ActualizarPerfilValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Apellido).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Telefono).MaximumLength(20);
    }
}

public class CambiarPasswordValidator : AbstractValidator<CambiarPasswordDTO>
{
    public CambiarPasswordValidator()
    {
        RuleFor(x => x.PasswordActual).NotEmpty();
        RuleFor(x => x.PasswordNueva).PasswordSegura();
    }
}
