using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using BGAUSS.Api.Settings;

namespace BGAUSS.Api.Services;

/// <summary>
/// Office 365 SMTP email sender — STARTTLS on port 587.
///
/// WHY From cannot be the user's email:
///   Office 365 enforces "authenticated sender = From address".
///   Attempting to set From = user@example.com while authenticating as
///   prasad.kurawade@bgauss.com will result in a 550 relay denied error.
///
/// SOLUTION: Keep From = configured service account, but:
///   • Set the From *display name* to show the user's identity visually
///     e.g.  "Rahul Sharma via BGAUSS" <prasad.kurawade@bgauss.com>
///   • Set Reply-To = user's actual email so admins can hit Reply and reach
///     the user directly — this is the standard pattern used by Outlook,
///     Gmail, Jira, GitHub notifications, etc.
/// </summary>
public class EmailService : IEmailService
{
    private readonly SmtpSettings        _smtp;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<SmtpSettings> smtp, ILogger<EmailService> logger)
    {
        _smtp   = smtp.Value;
        _logger = logger;
    }

    /// <param name="toEmail">Primary recipient (admin)</param>
    /// <param name="ccEmail">CC recipient (second admin); skipped if same as toEmail</param>
    /// <param name="subject">Subject line</param>
    /// <param name="htmlBody">Full HTML body</param>
    /// <param name="replyToEmail">
    ///   The user's actual email address.
    ///   • Appears in Reply-To header — admin hits Reply → goes to the user.
    ///   • Also used to build a friendly From display name so the email
    ///     visually reads as coming "via" the user.
    /// </param>
    /// <param name="senderDisplayName">
    ///   Optional human name of the sender (e.g. "Rahul Sharma").
    ///   When supplied, From display becomes:
    ///   "Rahul Sharma via BGAUSS" &lt;prasad.kurawade@bgauss.com&gt;
    /// </param>
    public async Task SendAsync(
        string  toEmail,
        string? ccEmail,
        string  subject,
        string  htmlBody,
        string? replyToEmail       = null,
        string? senderDisplayName  = null)
    {
        try
        {
            using var client = new SmtpClient(_smtp.Host, _smtp.Port)
            {
                EnableSsl             = _smtp.EnableSsl,   // true = STARTTLS on 587
                Credentials           = new NetworkCredential(_smtp.Username, _smtp.Password),
                DeliveryMethod        = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
            };

            using var mail = new MailMessage();

            // ── From ─────────────────────────────────────────────────────────
            // Office 365: address MUST match the authenticated account.
            // Display name is free-form — we use it to show the user's identity.
            string fromDisplayName = BuildFromDisplayName(senderDisplayName, replyToEmail);
            mail.From = new MailAddress(_smtp.FromEmail, fromDisplayName);

            // ── To ───────────────────────────────────────────────────────────
            mail.To.Add(new MailAddress(toEmail));

            // ── CC (skip if same as To to avoid duplicate delivery) ───────────
            if (!string.IsNullOrWhiteSpace(ccEmail) &&
                !ccEmail.Equals(toEmail, StringComparison.OrdinalIgnoreCase))
            {
                mail.CC.Add(new MailAddress(ccEmail));
            }

            // ── Reply-To ─────────────────────────────────────────────────────
            // This is the KEY header: when the admin hits "Reply" in Outlook/
            // Gmail the email goes directly to the user, not to the service acct.
            if (!string.IsNullOrWhiteSpace(replyToEmail))
                mail.ReplyToList.Add(new MailAddress(replyToEmail));

            mail.Subject    = subject;
            mail.Body       = htmlBody;
            mail.IsBodyHtml = true;

            await client.SendMailAsync(mail);

            _logger.LogInformation(
                "Email sent → To:{To} | CC:{CC} | ReplyTo:{ReplyTo} | Subject:{Subject}",
                toEmail, ccEmail ?? "—", replyToEmail ?? "—", subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to send email → To:{To} | Subject:{Subject}", toEmail, subject);
            throw;   // re-throw so callers can log/handle
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Builds the From display name shown in the admin's inbox.
    ///
    /// Priority:
    ///   1. senderDisplayName provided  → "Rahul Sharma via BGAUSS Parts Catalog"
    ///   2. replyToEmail provided only  → "rahul@example.com via BGAUSS Parts Catalog"
    ///   3. Neither provided            → configured FromName ("BGAUSS Parts Catalog")
    /// </summary>
    private string BuildFromDisplayName(string? displayName, string? email)
    {
        string baseName = _smtp.FromName; // "BGAUSS Parts Catalog"

        if (!string.IsNullOrWhiteSpace(displayName))
            return $"{displayName} via {baseName}";

        if (!string.IsNullOrWhiteSpace(email))
            return $"{email} via {baseName}";

        return baseName;
    }
}
