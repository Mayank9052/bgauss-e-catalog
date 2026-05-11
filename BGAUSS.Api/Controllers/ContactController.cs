using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using BGAUSS.Api.Services;
using BGAUSS.Api.Settings;
using BGAUSS.Api.DTOs;

namespace BGAUSS.Api.Controllers;

/// <summary>
/// POST /api/contact/send
/// Sends a contact form email to both admins (To + CC).
/// Reply-To is set to the sender's email so admins can reply directly.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IEmailService _email;
    private readonly SmtpSettings  _smtp;
    private readonly ILogger<ContactController> _logger;

    public ContactController(
        IEmailService              email,
        IOptions<SmtpSettings>     smtp,
        ILogger<ContactController> logger)
    {
        _email  = email;
        _smtp   = smtp.Value;
        _logger = logger;
    }

    
    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] ContactRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req?.Email) || string.IsNullOrWhiteSpace(req?.Message))
            return BadRequest(new { message = "Email and message are required." });

        try
        {
            var subject = string.IsNullOrWhiteSpace(req.Subject)
                ? "General Enquiry"
                : req.Subject;

            var htmlBody = EmailTemplates.ContactForm(
                subject:    subject,
                salutation: req.Salutation ?? "",
                firstName:  req.FirstName  ?? "",
                lastName:   req.LastName   ?? "",
                company:    req.Company    ?? "",
                userEmail:  req.Email,
                phone:      req.Phone      ?? "",
                message:    req.Message    ?? "");

            // Send to AdminEmail1 (To), AdminEmail2 (CC)
            // Reply-To = user's email so admin can reply directly
            await _email.SendAsync(
                toEmail:      _smtp.AdminEmail1,
                ccEmail:      _smtp.AdminEmail2,
                subject:      $"[BGAUSS Contact] {subject}",
                htmlBody:     htmlBody,
                replyToEmail: req.Email);

            return Ok(new { message = "Message sent successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Contact form email failed");
            return StatusCode(500, new { message = "Failed to send message. Please try again." });
        }
    }
}