using System.Text;
using Backend.Configuration;
using Backend.Data;
using Backend.Infrastructure;
using Backend.Mapping;
using Backend.Services;
using Backend.Validators;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(o => o.Filters.Add<FluentValidationFilter>());
builder.Services.AddDbContext<SmashZoneDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SmashZoneDB")));
builder.Services.AddOpenApi();

// --- Auth (JWT). Los valores se leen de forma diferida vía IOptions. ---
builder.Services.AddOptions<JwtSettings>()
    .Bind(builder.Configuration.GetSection(JwtSettings.Section))
    .Validate(s => s.Secret.Length >= 32, "JwtSettings:Secret debe tener al menos 32 caracteres (usa user-secrets o variable de entorno).")
    .ValidateOnStart();

builder.Services.AddOptions<CulqiSettings>()
    .Bind(builder.Configuration.GetSection(CulqiSettings.Section))
    .ValidateOnStart();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtSettings>>((o, jwt) =>
    {
        var s = jwt.Value;
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = s.Issuer,
            ValidateAudience = true, ValidAudience = s.Audience,
            ValidateLifetime = true, ClockSkew = TimeSpan.FromSeconds(30),
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(s.Secret)),
            NameClaimType = "sub"
        };
    });
builder.Services.AddAuthorization();

// --- Dominio ---
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddAutoMapper(cfg =>
{
    cfg.AddProfile<UsuarioProfile>();
    cfg.AddProfile<CatalogoProfile>();
});
builder.Services.AddValidatorsFromAssemblyContaining<RegistroValidator>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IAdminUsuarioService, AdminUsuarioService>();
builder.Services.AddScoped<ISalaService, SalaService>();
builder.Services.AddScoped<IPaqueteService, PaqueteService>();
builder.Services.AddScoped<IInventarioService, InventarioService>();
builder.Services.AddHttpClient<ICulqiClient, CulqiClient>((sp, c) =>
{
    var settings = sp.GetRequiredService<IOptions<CulqiSettings>>().Value;
    c.BaseAddress = new Uri("https://api.culqi.com/v2/");
    c.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", settings.SecretKey);
});

// --- CORS (frontend Vite) ---
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseMiddleware<ExcepcionesMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    await AdminSeeder.SeedAsync(app.Services, app.Configuration);
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
