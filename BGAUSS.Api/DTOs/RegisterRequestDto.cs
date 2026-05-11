// DTOs/RegisterRequest.cs
// Add the Email field so the register endpoint can accept and store the user's email.

using System.ComponentModel.DataAnnotations;

namespace BGAUSS.Api.DTOs;

public class RegisterRequestDto
{
    [Required]
    public string? Username { get; set; }

    [Required]
    public string? Password { get; set; }

    public string? Role { get; set; }

    // ✅ NEW: user's actual email address.
    // Optional — if omitted and Username looks like an email, Username is used.
    [EmailAddress]
    public string? Email { get; set; }
}