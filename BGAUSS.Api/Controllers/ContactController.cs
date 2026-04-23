// Controllers/ContactController.cs
// Sends the contact form email to both:
//   sachin.raut@bgauss.com
//   prasad.kurawade@bgauss.com
//
// Configure SMTP in appsettings.json:
// "SmtpSettings": {
//   "Host": "smtp.gmail.com",           ← or your SMTP server
//   "Port": 587,
//   "EnableSsl": true,
//   "Username": "noreply@bgauss.com",   ← sender address
//   "Password": "your-app-password",    ← app password or SMTP password
//   "FromName": "BGAUSS Parts Catalog"
// }

using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Net.Mail;
using BGAUSS.Api.DTOs;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<ContactController> _logger;

    public ContactController(IConfiguration config, ILogger<ContactController> logger)
    {
        _config = config;
        _logger = logger;
    }

    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] ContactFormDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { message = "Email and message are required." });

        try
        {
            var smtp    = _config.GetSection("SmtpSettings");
            var host    = smtp["Host"]     ?? "smtp.gmail.com";
            var port    = int.Parse(smtp["Port"] ?? "587");
            var ssl     = bool.Parse(smtp["EnableSsl"] ?? "true");
            var user    = smtp["Username"];
            var pass    = smtp["Password"];
            var from    = smtp["FromName"] ?? "BGAUSS Parts Catalog";

            // Validate required SMTP settings
            if (string.IsNullOrWhiteSpace(user))
                return StatusCode(500, new { message = "SMTP Username not configured in appsettings.json" });
            if (string.IsNullOrWhiteSpace(pass))
                return StatusCode(500, new { message = "SMTP Password not configured in appsettings.json" });

            // Build email body
            var body = $@"
<html><body style='font-family:Segoe UI,Arial,sans-serif;color:#1a1a2e;'>
<h2 style='color:#0b3c4d;'>New Contact Form Submission</h2>
<table style='border-collapse:collapse;width:100%;max-width:600px;'>
  <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:700;width:140px;'>Subject</td>
      <td style='padding:8px 12px;border-bottom:1px solid #e2e8f0;'>{Encode(dto.Subject ?? "General Enquiry")}</td></tr>
  <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:700;'>Name</td>
      <td style='padding:8px 12px;border-bottom:1px solid #e2e8f0;'>{Encode(dto.Salutation)} {Encode(dto.FirstName)} {Encode(dto.LastName)}</td></tr>
  <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:700;'>Company</td>
      <td style='padding:8px 12px;border-bottom:1px solid #e2e8f0;'>{Encode(dto.Company ?? "—")}</td></tr>
  <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:700;'>Email</td>
      <td style='padding:8px 12px;border-bottom:1px solid #e2e8f0;'><a href='mailto:{Encode(dto.Email)}'>{Encode(dto.Email)}</a></td></tr>
  <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:700;'>Phone</td>
      <td style='padding:8px 12px;border-bottom:1px solid #e2e8f0;'>{Encode(dto.Phone ?? "—")}</td></tr>
</table>
<h3 style='margin-top:20px;color:#0b3c4d;'>Message</h3>
<div style='background:#f8fafc;border-left:4px solid #0b3c4d;padding:14px 18px;border-radius:4px;white-space:pre-wrap;'>{Encode(dto.Message)}</div>
<hr style='margin-top:24px;border:none;border-top:1px solid #e2e8f0;'/>
<p style='font-size:12px;color:#94a3b8;'>Sent via BGAUSS Electronic Parts Catalog contact form</p>
</body></html>";

            var subject = $"[BGAUSS Parts] {dto.Subject ?? "General Enquiry"} — from {dto.Email}";

            using var client = new SmtpClient(host, port)
            {
                Credentials     = new NetworkCredential(user, pass),
                EnableSsl       = ssl,
                DeliveryMethod  = SmtpDeliveryMethod.Network,
                Timeout         = 30000, // 30 seconds
            };
            
            _logger.LogInformation("Connecting to SMTP: {Host}:{Port}, SSL={Ssl}, User={User}", host, port, ssl, user);

            // Send to both recipients in a single email
            var mail = new MailMessage
            {
                From       = new MailAddress(user, from),
                Subject    = subject,
                Body       = body,
                IsBodyHtml = true,
            };

            // Always send to both support addresses
            //mail.To.Add("priyanka.nikam@bgauss.com");
            mail.To.Add("sachin.raut@bgauss.com");
            mail.To.Add("prasad.kurawade@bgauss.com");

            // CC the sender so they have a copy
            if (!string.IsNullOrWhiteSpace(dto.Email))
                mail.ReplyToList.Add(new MailAddress(dto.Email, $"{dto.FirstName} {dto.LastName}".Trim()));

            await client.SendMailAsync(mail);

            _logger.LogInformation("Contact form email sent from {Email} to support team", dto.Email);
            return Ok(new { message = "Message sent successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send contact form email");
            return StatusCode(500, new { message = "Failed to send email. Please try again." });
        }
    }

    // HTML-encode to prevent injection in email body
    private static string Encode(string? s) =>
        System.Net.WebUtility.HtmlEncode(s ?? "");
}
