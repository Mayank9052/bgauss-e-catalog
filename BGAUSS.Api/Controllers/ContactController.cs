// Controllers/ContactController.cs
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Net.Mail;
using BGAUSS.Api.DTOs;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]   // ← /api/contact/...
public class ContactController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<ContactController> _logger;

    public ContactController(IConfiguration config, ILogger<ContactController> logger)
    {
        _config = config;
        _logger = logger;
    }

    [HttpPost("send")]        // ← POST /api/contact/send
    public async Task<IActionResult> Send([FromBody] ContactFormDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { message = "Email and message are required." });

        try
        {
            var smtp = _config.GetSection("SmtpSettings");

            var host      = smtp["Host"]      ?? "smtp-relay.brevo.com";
            var port      = int.Parse(smtp["Port"] ?? "587");
            var ssl       = bool.Parse(smtp["EnableSsl"] ?? "true");
            var user      = smtp["Username"];
            var pass      = smtp["Password"];
            var fromName  = smtp["FromName"]  ?? "BGAUSS Parts Catalog";
            var fromEmail = smtp["FromEmail"] ?? user; // fallback to SMTP login

            if (string.IsNullOrWhiteSpace(user))
                return StatusCode(500, new { message = "SMTP Username not configured." });
            if (string.IsNullOrWhiteSpace(pass))
                return StatusCode(500, new { message = "SMTP Password not configured." });

            // ── Build HTML body ──────────────────────────────────────
            var body = $@"
<html><body style='font-family:Segoe UI,Arial,sans-serif;color:#1a1a2e;max-width:640px;margin:0 auto;'>

  <div style='background:linear-gradient(90deg,#0b3c4d,#0e5068);padding:20px 24px;border-radius:8px 8px 0 0;'>
    <h2 style='color:#fff;margin:0;font-size:20px;'>📬 New Contact Form Submission</h2>
    <p style='color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;'>BGAUSS Electronic Parts Catalog</p>
  </div>

  <div style='background:#f8fafc;padding:20px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;'>
    <table style='border-collapse:collapse;width:100%;font-size:14px;'>
      <tr>
        <td style='padding:10px 12px;background:#fff;font-weight:700;color:#374151;width:130px;border-bottom:1px solid #e2e8f0;border-radius:6px 0 0 0;'>Subject</td>
        <td style='padding:10px 12px;background:#fff;border-bottom:1px solid #e2e8f0;'>{Encode(dto.Subject ?? "General Enquiry")}</td>
      </tr>
      <tr>
        <td style='padding:10px 12px;background:#f8fafc;font-weight:700;color:#374151;border-bottom:1px solid #e2e8f0;'>Full Name</td>
        <td style='padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;'>{Encode(dto.Salutation)} {Encode(dto.FirstName)} {Encode(dto.LastName)}</td>
      </tr>
      <tr>
        <td style='padding:10px 12px;background:#fff;font-weight:700;color:#374151;border-bottom:1px solid #e2e8f0;'>Company</td>
        <td style='padding:10px 12px;background:#fff;border-bottom:1px solid #e2e8f0;'>{Encode(dto.Company ?? "—")}</td>
      </tr>
      <tr>
        <td style='padding:10px 12px;background:#f8fafc;font-weight:700;color:#374151;border-bottom:1px solid #e2e8f0;'>Email</td>
        <td style='padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;'>
          <a href='mailto:{Encode(dto.Email)}' style='color:#1d4ed8;'>{Encode(dto.Email)}</a>
        </td>
      </tr>
      <tr>
        <td style='padding:10px 12px;background:#fff;font-weight:700;color:#374151;'>Phone</td>
        <td style='padding:10px 12px;background:#fff;'>{Encode(dto.Phone ?? "—")}</td>
      </tr>
    </table>

    <h3 style='margin:20px 0 8px;color:#0b3c4d;font-size:15px;'>Message</h3>
    <div style='background:#fff;border-left:4px solid #0b3c4d;padding:14px 18px;border-radius:4px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#374151;'>
      {Encode(dto.Message)}
    </div>

    <hr style='margin:24px 0 12px;border:none;border-top:1px solid #e2e8f0;'/>
    <p style='font-size:11px;color:#94a3b8;margin:0;'>
      Sent via BGAUSS Electronic Parts Catalog contact form · {DateTime.Now:dd MMM yyyy, HH:mm}
    </p>
  </div>

</body></html>";

            var subject = $"[BGAUSS Parts] {dto.Subject ?? "General Enquiry"} — from {dto.FirstName} {dto.LastName} ({dto.Email})";

            // ── Send email ───────────────────────────────────────────
            using var client = new SmtpClient(host, port)
            {
                Credentials    = new NetworkCredential(user, pass),
                EnableSsl      = ssl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout        = 30_000,
            };

            using var mail = new MailMessage
            {
                From       = new MailAddress(fromEmail!, fromName),
                Subject    = subject,
                Body       = body,
                IsBodyHtml = true,
            };

            // Primary recipients
            mail.To.Add("sachin.raut@bgauss.com");
            mail.To.Add("prasad.kurawade@bgauss.com");

            // Reply-To so recipients can reply directly to sender
            if (!string.IsNullOrWhiteSpace(dto.Email))
                mail.ReplyToList.Add(new MailAddress(
                    dto.Email,
                    $"{dto.FirstName} {dto.LastName}".Trim()
                ));

            _logger.LogInformation(
                "Sending contact email: From={From}, Subject={Subject}, SMTP={Host}:{Port}",
                fromEmail, subject, host, port
            );

            await client.SendMailAsync(mail);

            _logger.LogInformation("Contact email sent successfully from {Email}", dto.Email);
            return Ok(new { message = "Message sent successfully." });
        }
        catch (SmtpException ex)
        {
            _logger.LogError(ex, "SMTP error sending contact email. StatusCode={Status}", ex.StatusCode);
            return StatusCode(500, new { message = $"SMTP error: {ex.Message}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error sending contact email");
            return StatusCode(500, new { message = "Failed to send email. Please try again." });
        }
    }

    private static string Encode(string? s) =>
        WebUtility.HtmlEncode(s ?? "");
}