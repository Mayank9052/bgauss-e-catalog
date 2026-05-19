using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;
using BGAUSS.Api.Settings;

namespace BGAUSS.Api.Services;

/// <summary>
/// Office 365 SMTP email sender using MailKit.
///
/// WHY MailKit instead of System.Net.Mail.SmtpClient:
///   System.Net.Mail.SmtpClient is marked [Obsolete] in .NET 6+ and has a
///   known bug with Office 365 STARTTLS on port 587 — setting EnableSsl=true
///   triggers implicit SSL (port 465 behaviour) instead of STARTTLS, causing
///   "5.7.57 SMTP client was not authenticated" or SSL handshake failures.
///
///   MailKit explicitly uses SecureSocketOptions.StartTls which is what
///   Office 365 smtp.office365.com:587 requires.
///
/// WHY From cannot be the user's email:
///   Office 365 enforces "authenticated sender = From address".
///   Attempting to set From = user@example.com while authenticating as
///   prasad.kurawade@bgauss.com results in a 550 relay denied error.
///
/// SOLUTION:
///   • Keep From = configured service account (prasad.kurawade@bgauss.com)
///   • Set From display name to show user's identity visually
///     e.g. "Rahul Sharma via BGAUSS" <prasad.kurawade@bgauss.com>
///   • Set Reply-To = user's actual email so admins can hit Reply
///     and reach the user directly — standard pattern used by GitHub,
///     Jira, Outlook notifications, etc.
/// </summary>
public class EmailService : IEmailService
{
    private readonly SmtpSettings          _smtp;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<SmtpSettings> smtp, ILogger<EmailService> logger)
    {
        _smtp   = smtp.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string  toEmail,
        string? ccEmail,
        string  subject,
        string  htmlBody,
        string? replyToEmail      = null,
        string? senderDisplayName = null)
    {
        // ── Build MIME message ────────────────────────────────────────────────
        var message = new MimeMessage();

        // From — must be the authenticated Office 365 account
        string fromDisplay = BuildFromDisplayName(senderDisplayName, replyToEmail);
        message.From.Add(new MailboxAddress(fromDisplay, _smtp.FromEmail));

        // To
        message.To.Add(new MailboxAddress("", toEmail));

        // CC — skip if same as To (avoids duplicate delivery)
        if (!string.IsNullOrWhiteSpace(ccEmail) &&
            !ccEmail.Equals(toEmail, StringComparison.OrdinalIgnoreCase))
        {
            message.Cc.Add(new MailboxAddress("", ccEmail));
        }

        // Reply-To — admin hits Reply → goes to the user directly
        if (!string.IsNullOrWhiteSpace(replyToEmail))
            message.ReplyTo.Add(new MailboxAddress("", replyToEmail));

        message.Subject = subject;

        // Build body (HTML + plain-text fallback)
        var bodyBuilder = new BodyBuilder
        {
            HtmlBody  = htmlBody,
            TextBody  = StripHtml(htmlBody),   // plain-text fallback for email clients that don't render HTML
        };
        message.Body = bodyBuilder.ToMessageBody();

        // ── Connect and send via STARTTLS ─────────────────────────────────────
        // SecureSocketOptions.StartTls is the correct mode for Office 365 port 587.
        // Do NOT use SslOnConnect (that's port 465 / implicit SSL).
        using var client = new SmtpClient();

        try
        {
            await client.ConnectAsync(_smtp.Host, _smtp.Port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_smtp.Username, _smtp.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(quit: true);

            _logger.LogInformation(
                "Email sent → To:{To} CC:{CC} ReplyTo:{ReplyTo} Subject:{Subject}",
                toEmail, ccEmail ?? "—", replyToEmail ?? "—", subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to send email → To:{To} Subject:{Subject}", toEmail, subject);
            throw;   // re-throw so ContactController / OrderController can handle
        }
        finally
        {
            // Ensure client is always disconnected even if send fails mid-flight
            if (client.IsConnected)
            {
                try { await client.DisconnectAsync(quit: false); }
                catch { /* best-effort disconnect, ignore secondary errors */ }
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private string BuildFromDisplayName(string? displayName, string? email)
    {
        string baseName = _smtp.FromName; // "BGAUSS Parts Catalog"

        if (!string.IsNullOrWhiteSpace(displayName))
            return $"{displayName} via {baseName}";

        if (!string.IsNullOrWhiteSpace(email))
            return $"{email} via {baseName}";

        return baseName;
    }

    /// <summary>
    /// Very lightweight HTML stripper for generating plain-text fallback.
    /// Not a full parser — just removes tags and decodes common entities.
    /// </summary>
    private static string StripHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return "";
        var text = System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ");
        text = System.Net.WebUtility.HtmlDecode(text);
        text = System.Text.RegularExpressions.Regex.Replace(text, @"\s{2,}", " ");
        return text.Trim();
    }
}