using Microsoft.AspNetCore.Mvc;
using BGAUSS.Api.Models;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (request == null)
            return BadRequest("Invalid request.");

        // 🔐 Dummy validation (Replace with DB later)
        if (request.Username == "admin" && request.Password == "1234")
        {
            var response = new LoginResponse
            {
                Username = request.Username,
                Token = Guid.NewGuid().ToString() // temporary token
            };

            return Ok(response);
        }

        return Unauthorized(new { message = "Invalid username or password" });
    }
}