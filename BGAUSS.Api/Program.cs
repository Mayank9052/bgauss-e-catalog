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
        builder.Configuration.GetConnectionString("DefaultConnection")));

// ================= JWT AUTH =================
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
string jwtKey = jwtSettings["Key"] ?? throw new InvalidOperationException("JwtSettings:Key is missing");
string jwtIssuer = jwtSettings["Issuer"] ?? "BGAUSS.Api";
string jwtAudience = jwtSettings["Audience"] ?? "BGAUSS.Client";
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });

builder.Services.AddAuthorization();

// ================= SWAGGER =================
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
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
                    Id = "Bearer"
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
        policy.WithOrigins(
                "http://localhost:5173",
                "http://192.168.68.54:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ================= SERVICES =================
builder.Services.AddScoped<ISearchService, SearchService>();

var app = builder.Build();

// ================= MIDDLEWARE ORDER =================
app.UseCors("ReactPolicy");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseHttpsRedirection();

app.UseAuthentication();   // MUST come before Authorization
app.UseAuthorization();

app.UseStaticFiles();

app.MapControllers();

app.Run();
