using Microsoft.AspNetCore.Mvc;
using BGAUSS.Api.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using BGAUSS.Api.DTOs;

namespace BGAUSS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration       _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context       = context;
            _configuration = configuration;
        }

        // ── REGISTER ─────────────────────────────────────────────────────────
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                return BadRequest(new { message = "Username already exists" });

            string hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Username     = request.Username ?? "",
                PasswordHash = hashedPassword,
                Role         = request.Role ?? "User",
                IsActive     = true,
                CreatedAt    = DateTime.UtcNow,
                UpdatedAt    = DateTime.UtcNow,

                // ✅ FIX: Save the user's email on registration.
                // Priority: explicit Email field → fall back to Username if it
                // looks like an email (contains @), otherwise leave null.
                Email = !string.IsNullOrWhiteSpace(request.Email)
                    ? request.Email.Trim()
                    : (request.Username?.Contains('@') == true ? request.Username.Trim() : null)
            };

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User created successfully" });
        }

        // ── LOGIN ─────────────────────────────────────────────────────────────
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

            if (user == null)
                return Unauthorized(new { message = "Invalid username or password" });

            bool isPasswordValid = false;

            try
            {
                isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            }
            catch (BCrypt.Net.SaltParseException)
            {
                return Unauthorized(new { message = "Invalid username or password" });
            }

            if (!isPasswordValid)
                return Unauthorized(new { message = "Invalid username or password" });

            var token = GenerateJwtToken(user);

            return Ok(new LoginResponse
            {
                Username = user.Username,
                Token    = token
            });
        }

        // ── GENERATE JWT TOKEN ────────────────────────────────────────────────
        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");

            string keyString = jwtSettings["Key"]
                ?? throw new Exception("JWT Key missing in configuration");

            var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // ✅ FIX: embed UserEmail claim in the token so any controller can
            //    read the logged-in user's email without a DB lookup.
            //    Resolve: User.Email column → Username if it's an email → empty string.
            string resolvedEmail = !string.IsNullOrWhiteSpace(user.Email)
                ? user.Email
                : (user.Username.Contains('@') ? user.Username : "");

            var claims = new[]
            {
                new Claim("UserId",                user.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name,           user.Username),
                new Claim(ClaimTypes.Role,           user.Role ?? "User"),
                // ✅ NEW: user's actual email — readable via User.FindFirst("UserEmail")
                new Claim("UserEmail",               resolvedEmail),
            };

            string issuer   = jwtSettings["Issuer"]   ?? "BGAUSS.Api";
            string audience = jwtSettings["Audience"] ?? "BGAUSS.Client";

            var token = new JwtSecurityToken(
                issuer:            issuer,
                audience:          audience,
                claims:            claims,
                expires:           DateTime.UtcNow.AddHours(2),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // ── FORGOT PASSWORD ───────────────────────────────────────────────────
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username))
                return BadRequest("Username is required");

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

            if (user == null)
                return Ok(new { message = "If user exists, reset instructions sent." });

            var resetToken = Guid.NewGuid().ToString();

            user.PasswordResetToken        = resetToken;
            user.PasswordResetTokenExpiry  = DateTime.UtcNow.AddMinutes(30);
            user.UpdatedAt                 = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message    = "Password reset token generated",
                resetToken = resetToken
            });
        }

        // ── RESET PASSWORD ────────────────────────────────────────────────────
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Token)    ||
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("Invalid request");
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.Username == request.Username &&
                    u.PasswordResetToken == request.Token &&
                    u.PasswordResetTokenExpiry > DateTime.UtcNow);

            if (user == null)
                return BadRequest("Invalid or expired token");

            user.PasswordHash             = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.PasswordResetToken       = null;
            user.PasswordResetTokenExpiry = null;
            user.UpdatedAt                = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Password reset successful" });
        }
    }
}