using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using OfficeOpenXml;

var builder = WebApplication.CreateBuilder(args);

// EPPlus License
OfficeOpenXml.ExcelPackage.License.SetNonCommercialOrganization("BGAUSS");

// Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.ReferenceHandler = 
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DB
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Enable CORS first (before other middleware)
app.UseCors("ReactPolicy");

// Swagger configuration
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.RoutePrefix = "swagger"; // Swagger at /swagger
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "BGAUSS API v1");
    });
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();