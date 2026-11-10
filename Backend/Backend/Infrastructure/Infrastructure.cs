using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Backend.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Backend.Infrastructure;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(sub, out var id) ? id : throw new NoAutorizadoException("Token sin identificador de usuario.");
    }
}

/// <summary>Traduce excepciones de dominio a respuestas ProblemDetails.</summary>
public class ExcepcionesMiddleware(RequestDelegate next, ILogger<ExcepcionesMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (DomainException ex)
        {
            var status = ex switch
            {
                NoAutorizadoException => StatusCodes.Status401Unauthorized,
                NoEncontradoException => StatusCodes.Status404NotFound,
                ConflictoException => StatusCodes.Status409Conflict,
                _ => StatusCodes.Status400BadRequest
            };
            ctx.Response.StatusCode = status;
            await ctx.Response.WriteAsJsonAsync(new ProblemDetails { Status = status, Title = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error no controlado");
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await ctx.Response.WriteAsJsonAsync(new ProblemDetails { Status = 500, Title = "Error interno del servidor." });
        }
    }
}

/// <summary>Ejecuta los validadores FluentValidation registrados para cada argumento del action.</summary>
public class FluentValidationFilter(IServiceProvider sp) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var arg in context.ActionArguments.Values.Where(a => a is not null))
        {
            var validatorType = typeof(IValidator<>).MakeGenericType(arg!.GetType());
            if (sp.GetService(validatorType) is not IValidator validator) continue;

            var result = await validator.ValidateAsync(new ValidationContext<object>(arg));
            if (result.IsValid) continue;

            var errors = result.Errors.GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            context.Result = new BadRequestObjectResult(new ValidationProblemDetails(errors) { Status = 400 });
            return;
        }
        await next();
    }
}
