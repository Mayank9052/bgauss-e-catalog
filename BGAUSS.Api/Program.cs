using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using BGAUSS.Api.Models;
using BGAUSS.Api.Services;
using OfficeOpenXml;
using QuestPDF.Infrastructure;

// SET LICENSES FIRST
ExcelPackage.License.SetNonCommercialOrganization("BGAUSS");
QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// ================= CONTROLLERS =================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// ================= DATABASE =================
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.EnableRetryOnFailure()
    ));

// ================= JWT AUTH =================
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
string jwtKey     = jwtSettings["Key"]      ?? throw new InvalidOperationException("JwtSettings:Key is missing");
string jwtIssuer  = jwtSettings["Issuer"]   ?? "BGAUSS.Api";
string jwtAudience= jwtSettings["Audience"] ?? "BGAUSS.Client";
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtIssuer,
            ValidAudience            = jwtAudience,
            IssuerSigningKey         = new SymmetricSecurityKey(key)
        };
    });

builder.Services.AddAuthorization();

// ================= SWAGGER =================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name        = "Authorization",
        Type        = SecuritySchemeType.Http,
        Scheme      = "bearer",
        BearerFormat= "JWT",
        In          = ParameterLocation.Header,
        Description = "Enter: Bearer {your token}"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// ================= CORS =================
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ================= SERVICES =================
builder.Services.AddScoped<ISearchService, SearchService>();

// ================= BUILD APP =================
var app = builder.Build();

// ================= MIDDLEWARE ORDER =================
// CORS must be first
app.UseCors("ReactPolicy");

// Swagger — available in all environments for easy testing
app.UseSwagger();
app.UseSwaggerUI();

// Do NOT use HTTPS redirection — running plain HTTP on IIS port 5000
// app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// Serve static files from wwwroot (images, CSS, JS)
app.UseStaticFiles();

// API controllers
app.MapControllers();

// SPA fallback — serves index.html for all non-API routes
app.MapFallbackToFile("index.html");

app.Run();