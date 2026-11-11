using Backend.DTOs;
using FluentValidation;

namespace Backend.Validators;

public class CrearReservaValidator : AbstractValidator<CrearReservaDTO>
{
    public CrearReservaValidator()
    {
        RuleFor(x => x.IdSala).GreaterThan(0);
        RuleFor(x => x.IdPaquete).GreaterThan(0);
        RuleFor(x => x.NumParticipantes).GreaterThan(0);
        RuleFor(x => x.NotasEspeciales).MaximumLength(500);
        RuleForEach(x => x.Extras).ChildRules(e =>
        {
            e.RuleFor(d => d.IdItemExtra).GreaterThan(0);
            e.RuleFor(d => d.Cantidad).GreaterThan(0);
        });
    }
}

public class CambiarEstadoReservaValidator : AbstractValidator<CambiarEstadoReservaDTO>
{
    public CambiarEstadoReservaValidator()
    {
        RuleFor(x => x.NuevoEstado).NotEmpty()
            .Must(e => e is "Cancelada" or "EnProceso" or "Completada")
            .WithMessage("NuevoEstado debe ser 'Cancelada', 'EnProceso' o 'Completada'.");
    }
}
