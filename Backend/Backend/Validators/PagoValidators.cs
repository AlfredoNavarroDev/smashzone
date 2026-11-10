using Backend.DTOs;
using FluentValidation;

namespace Backend.Validators;

public class CrearPagoValidator : AbstractValidator<CrearPagoDTO>
{
    public CrearPagoValidator()
    {
        RuleFor(x => x.IdMetodoPago).GreaterThan(0);
    }
}
