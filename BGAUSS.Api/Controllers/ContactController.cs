using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using BGAUSS.Api.Services;
using BGAUSS.Api.Settings;
using BGAUSS.Api.DTOs;

namespace BGAUSS.Api.Controllers;

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

    // ── TEMPORARY DIAGNOSTIC ENDPOINT ────────────────────────────────────────
    // GET /api/contact/smtp-test
    // Call this from Swagger or browser to verify SMTP connectivity.
    // REMOVE THIS ENDPOINT BEFORE GOING TO PRODUCTION.
    //
    // Common results:
    //   ✅ "SMTP test passed"          → credentials and network are fine
    //   ❌ "5.7.57 SMTP..."            → account requires App Password or MFA app password
    //   ❌ "5.7.3 Authentication..."   → wrong username/password
    //   ❌ "Connection timed out"      → port 587 blocked by server firewall/host
    //   ❌ "SSL/TLS error"             → EnableSsl config mismatch
    [HttpGet("smtp-test")]
    public async Task<IActionResult> SmtpTest()
    {
        try
        {
            await _email.SendAsync(
                toEmail:      _smtp.AdminEmail1,
                ccEmail:      null,
                subject:      "[BGAUSS] SMTP Diagnostic Test",
                htmlBody:     "<p>This is a test email from the BGAUSS diagnostic endpoint.</p>",
                replyToEmail: null);

            return Ok(new
            {
                status  = "✅ SMTP test passed",
                host    = _smtp.Host,
                port    = _smtp.Port,
                from    = _smtp.FromEmail,
                to      = _smtp.AdminEmail1,
            });
        }
        catch (Exception ex)
        {
            // Returns full exception chain so you can see exactly what Office 365 rejected
            return StatusCode(500, new
            {
                status     = "❌ SMTP test failed",
                error      = ex.Message,
                innerError = ex.InnerException?.Message,
                type       = ex.GetType().FullName,
                host       = _smtp.Host,
                port       = _smtp.Port,
                enableSsl  = _smtp.EnableSsl,
                from       = _smtp.FromEmail,
                username   = _smtp.Username,
            });
        }
    }

    // ── MAIN SEND ENDPOINT ────────────────────────────────────────────────────
    // POST /api/contact/send
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
            // ── TEMPORARY: return full error detail for debugging ─────────────
            // Once contact form works reliably, change this back to just 500
            // with a generic message (remove ex.Message and inner from response).
            _logger.LogError(ex,
                "Contact form email failed | To:{To} | Subject:{Subj}",
                _smtp.AdminEmail1, req.Subject);

            return StatusCode(500, new
            {
                message    = "Failed to send message.",
                error      = ex.Message,
                innerError = ex.InnerException?.Message,
                type       = ex.GetType().Name,
            });
        }
    }
}