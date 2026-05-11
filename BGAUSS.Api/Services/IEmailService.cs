namespace BGAUSS.Api.Services;

public interface IEmailService
{
    /// <summary>
    /// Send an HTML email via Office 365 SMTP.
    /// </summary>
    /// <param name="toEmail">Primary recipient (e.g. AdminEmail1)</param>
    /// <param name="ccEmail">Optional CC (e.g. AdminEmail2); skipped if same as toEmail</param>
    /// <param name="subject">Email subject line</param>
    /// <param name="htmlBody">Full HTML body string</param>
    /// <param name="replyToEmail">
    ///   User's actual email address. Admins clicking Reply go to this address.
    ///   Also used to build the From display name.
    /// </param>
    /// <param name="senderDisplayName">
    ///   Optional human name of the initiating user (e.g. "Rahul Sharma").
    ///   When set, the From display becomes: "Rahul Sharma via BGAUSS Parts Catalog"
    /// </param>
    Task SendAsync(
        string  toEmail,
        string? ccEmail,
        string  subject,
        string  htmlBody,
        string? replyToEmail      = null,
        string? senderDisplayName = null);
}
