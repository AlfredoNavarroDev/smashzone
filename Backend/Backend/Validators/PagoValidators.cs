using Backend.DTOs;
using FluentValidation;

namespace Backend.Validators;

public class CrearPagoValidator : AbstractValidator<CrearPagoDTO>
{
    public CrearPagoValidator()
    {
        RuleFor(x => x.IdMetodoPago).GreaterThan(0);
        // Pagos.TransaccionRef es NVARCHAR(100): sin esto un ref más largo revienta en el INSERT.
        RuleFor(x => x.TransaccionRef).MaximumLength(100);
    }
}
