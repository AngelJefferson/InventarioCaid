using System.Text;
using InventoryManagement.API.Middleware;
using InventoryManagement.Application;
using InventoryManagement.Application.Common.Interfaces;
using InventoryManagement.Domain.Entities;
using InventoryManagement.Domain.Interfaces;
using InventoryManagement.Infrastructure.Data;
using InventoryManagement.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

using DomainUser = InventoryManagement.Domain.Entities.User;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();

builder.Services.AddScoped<IAuditLogService, InventoryManagement.Infrastructure.Services.MongoAuditLogService>();

builder.Services.AddDbContext<IApplicationDbContext, ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrEmpty(connectionString))
        options.UseNpgsql(connectionString);
    else
        options.UseInMemoryDatabase("InventoryDb");
});

var jwtSettings = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSettings["Key"]!))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
        c.SwaggerDoc("v1", new() { Title = "InventarioCAID API - Control de Equipos Tecnológicos", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new()
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            []
        }
    });
});

builder.Services.AddScoped<IUserRepository, UserRepository>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var ctx = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
    if (ctx is DbContext context)
        context.Database.EnsureCreated();

    var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
    if (!await userRepo.ExistsAsync("admin"))
    {
        var adminHash = BCrypt.Net.BCrypt.HashPassword("admin123");
        await userRepo.AddAsync(new DomainUser("admin", adminHash, "admin@inventory.com", "Admin"));
    }
    if (!await userRepo.ExistsAsync("user"))
    {
        var userHash = BCrypt.Net.BCrypt.HashPassword("user123");
        await userRepo.AddAsync(new DomainUser("user", userHash, "user@inventory.com", "User"));
    }

    var employeeRepo = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
    var consultorios = new[] { "Consultorio 1", "Consultorio 2", "Consultorio 3", "Consultorio 4" };
    foreach (var name in consultorios)
    {
        if (!await employeeRepo.Employees.AnyAsync(e => e.FullName == name))
        {
            employeeRepo.Employees.Add(new Employee(name, "Consultorios", "CAID", "Consultorio"));
        }
    }
    if (employeeRepo is DbContext empCtx) await empCtx.SaveChangesAsync();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
