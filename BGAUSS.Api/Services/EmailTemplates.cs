namespace BGAUSS.Api.Services;

/// <summary>
/// Centralised HTML email templates for BGAUSS.
/// </summary>
public static class EmailTemplates
{
    // ── Shared header/footer ─────────────────────────────────────────────────
    private static string Wrap(string title, string body) => $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"" />
  <meta name=""viewport"" content=""width=device-width,initial-scale=1"" />
  <title>{title}</title>
</head>
<body style=""margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,Helvetica,sans-serif;"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#f4f6f8;padding:32px 0;"">
    <tr><td align=""center"">
      <table width=""600"" cellpadding=""0"" cellspacing=""0""
             style=""background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);"">

        <!-- Header -->
        <tr>
          <td style=""background:linear-gradient(90deg,#0b3c4d,#0e5068);padding:24px 32px;"">
            <h1 style=""margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:.5px;"">
              BGAUSS
            </h1>
            <p style=""margin:4px 0 0;color:rgba(255,255,255,.75);font-size:13px;"">
              Electronic Parts Catalog
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style=""padding:28px 32px;"">
            {body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style=""background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;"">
            <p style=""margin:0;color:#94a3b8;font-size:11px;text-align:center;"">
              This is an automated message from BGAUSS Electronic Parts Catalog.<br/>
              Please do not reply directly to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>";

    // ── ORDER CONFIRMATION ────────────────────────────────────────────────────
    /// <summary>
    /// Email sent to both admins when a user places an order.
    /// </summary>
    public static string OrderConfirmation(
        string   userEmail,
        string   username,
        int      orderId,
        decimal  totalAmount,
        DateTime placedAt,
        IEnumerable<(string PartNumber, string PartName, int Qty, decimal SubTotal)> items)
    {
        // Build items rows
        var rows = string.Concat(items.Select(i => $@"
          <tr>
            <td style=""padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;"">{i.PartNumber}</td>
            <td style=""padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;"">{i.PartName}</td>
            <td style=""padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;text-align:center;"">{i.Qty}</td>
            <td style=""padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;text-align:right;"">₹{i.SubTotal:N2}</td>
          </tr>"));

        var body = $@"
          <h2 style=""margin:0 0 4px;color:#0b3c4d;font-size:20px;"">New Order Placed 🛒</h2>
          <p style=""margin:0 0 20px;color:#64748b;font-size:13px;"">
            A new order has been placed on the BGAUSS Parts Catalog.
          </p>

          <!-- Order meta -->
          <table width=""100%"" cellpadding=""0"" cellspacing=""0""
                 style=""background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:20px;"">
            <tr>
              <td style=""padding:12px 16px;"">
                <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
                  <tr>
                    <td style=""font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding-bottom:4px;"">Order ID</td>
                    <td style=""font-size:14px;color:#0b3c4d;font-weight:800;text-align:right;"">#{orderId}</td>
                  </tr>
                  <tr>
                    <td style=""font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding-bottom:4px;"">User</td>
                    <td style=""font-size:13px;color:#374151;text-align:right;"">{username} &lt;{userEmail}&gt;</td>
                  </tr>
                  <tr>
                    <td style=""font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding-bottom:4px;"">Placed At</td>
                    <td style=""font-size:13px;color:#374151;text-align:right;"">{placedAt:dd MMM yyyy, hh:mm tt} UTC</td>
                  </tr>
                  <tr>
                    <td style=""font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;"">Total Amount</td>
                    <td style=""font-size:16px;color:#166534;font-weight:800;text-align:right;"">₹{totalAmount:N2}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Items table -->
          <p style=""margin:0 0 8px;font-size:13px;font-weight:700;color:#374151;"">Order Items</p>
          <table width=""100%"" cellpadding=""0"" cellspacing=""0""
                 style=""border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;"">
            <thead>
              <tr style=""background:#0b3c4d;"">
                <th style=""padding:9px 12px;color:#fff;font-size:11px;text-align:left;"">Part No.</th>
                <th style=""padding:9px 12px;color:#fff;font-size:11px;text-align:left;"">Part Name</th>
                <th style=""padding:9px 12px;color:#fff;font-size:11px;text-align:center;"">Qty</th>
                <th style=""padding:9px 12px;color:#fff;font-size:11px;text-align:right;"">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rows}
              <tr style=""background:#f8fafc;"">
                <td colspan=""3"" style=""padding:10px 12px;font-size:13px;font-weight:700;color:#374151;text-align:right;"">Total</td>
                <td style=""padding:10px 12px;font-size:15px;font-weight:800;color:#166534;text-align:right;"">₹{totalAmount:N2}</td>
              </tr>
            </tbody>
          </table>

          <p style=""margin:20px 0 0;font-size:12px;color:#94a3b8;"">
            Reply to this email to contact the user directly.
          </p>";

        return Wrap($"New Order #{orderId} — BGAUSS", body);
    }

    // ── CONTACT FORM ─────────────────────────────────────────────────────────
    /// <summary>
    /// Email sent to both admins from the Contact Us form.
    /// </summary>
    public static string ContactForm(
        string  subject,
        string  salutation,
        string  firstName,
        string  lastName,
        string  company,
        string  userEmail,
        string  phone,
        string  message)
    {
        var fullName = string.Join(" ",
            new[] { salutation, firstName, lastName }.Where(s => !string.IsNullOrWhiteSpace(s)));

        var body = $@"
          <h2 style=""margin:0 0 4px;color:#0b3c4d;font-size:20px;"">New Contact Message 📩</h2>
          <p style=""margin:0 0 20px;color:#64748b;font-size:13px;"">
            A user has submitted the Contact Us form.
          </p>

          <!-- Sender info -->
          <table width=""100%"" cellpadding=""0"" cellspacing=""0""
                 style=""background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:20px;"">
            <tr>
              <td style=""padding:12px 16px;"">
                <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
                  <tr>
                    <td style=""font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding-bottom:6px;width:120px;"">Subject</td>
                    <td style=""font-size:13px;color:#0b3c4d;font-weight:700;"">{(string.IsNullOrWhiteSpace(subject) ? "General Enquiry" : subject)}</td>
                  </tr>
                  <tr>
                    <td style=""font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding-bottom:6px;"">Name</td>
                    <td style=""font-size:13px;color:#374151;"">{(string.IsNullOrWhiteSpace(fullName) ? "—" : fullName)}</td>
                  </tr>
                  <tr>
                    <td style=""font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding-bottom:6px;"">Company</td>
                    <td style=""font-size:13px;color:#374151;"">{(string.IsNullOrWhiteSpace(company) ? "—" : company)}</td>
                  </tr>
                  <tr>
                    <td style=""font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding-bottom:6px;"">Email</td>
                    <td style=""font-size:13px;"">
                      <a href=""mailto:{userEmail}"" style=""color:#1d4ed8;"">{userEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style=""font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;"">Phone</td>
                    <td style=""font-size:13px;color:#374151;"">{(string.IsNullOrWhiteSpace(phone) ? "—" : phone)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Message body -->
          <p style=""margin:0 0 8px;font-size:13px;font-weight:700;color:#374151;"">Message</p>
          <div style=""background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
                      padding:14px 16px;font-size:14px;color:#374151;line-height:1.6;
                      white-space:pre-wrap;"">
            {System.Net.WebUtility.HtmlEncode(message)}
          </div>

          <p style=""margin:16px 0 0;font-size:12px;color:#94a3b8;"">
            Reply to this email to respond directly to the sender.
          </p>";

        return Wrap($"Contact: {(string.IsNullOrWhiteSpace(subject) ? "General Enquiry" : subject)} — BGAUSS", body);
    }
}