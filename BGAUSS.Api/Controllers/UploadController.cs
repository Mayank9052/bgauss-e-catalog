// Controllers/UploadController.cs
// ✅ Accepts images (JPG, PNG, WebP, GIF) for colours
// ✅ Accepts images + PDF for assemblies (endpoint: /api/upload/image)
// ✅ PDFs saved to images/assemblies/  — returned path stored in DB

using Microsoft.AspNetCore.Mvc;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<UploadController> _logger;

    // ── Allowed MIME types ────────────────────────────────────────────────────
    private static readonly HashSet<string> ImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    };

    private static readonly HashSet<string> AllTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",   // ← PDF support for assembly diagrams
    };

    // ── Allowed extensions (extra guard beyond MIME) ──────────────────────────
    private static readonly HashSet<string> AllExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"
    };

    public UploadController(IWebHostEnvironment env, ILogger<UploadController> logger)
    {
        _env    = env;
        _logger = logger;
    }

    // ── POST /api/upload/image ────────────────────────────────────────────────
    // Accepts: images (for colours) AND images + PDFs (for assembly diagrams)
    // The caller decides what to allow via the HTML <input accept="..."> attribute.
    // The backend allows all supported types — the front-end already restricts
    // colour uploads to images only and assembly uploads to image + PDF.
    [HttpPost("image")]
    // Optional ?folder=parts stores individual part images under images/parts
    // (default behaviour for colours / assemblies is unchanged).
    public async Task<IActionResult> UploadImage(IFormFile file, [FromQuery] string? folder = null)
    {
        // ── 1. Basic presence check ───────────────────────────────────────────
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        // ── 2. Extension check (first line of defence) ────────────────────────
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllExtensions.Contains(ext))
            return BadRequest(new
            {
                message = $"File type '{ext}' is not allowed. Accepted: JPG, PNG, WebP, GIF, PDF."
            });

        // ── 3. MIME type check ────────────────────────────────────────────────
        var mime = file.ContentType.ToLowerInvariant().Split(';')[0].Trim();
        if (!AllTypes.Contains(mime))
            return BadRequest(new
            {
                message = $"Content type '{mime}' is not allowed. " +
                           "Accepted: image/jpeg, image/png, image/webp, image/gif, application/pdf."
            });

        // ── 4. Size check — 20 MB max (PDFs can be larger than images) ────────
        const long maxBytes = 20 * 1024 * 1024;
        if (file.Length > maxBytes)
            return BadRequest(new { message = "File size must be under 20 MB." });

        try
        {
            // ── 5. Choose subfolder ───────────────────────────────────────────
            // PDFs always go to images/assemblies
            // PNGs → images/assemblies (typically assembly diagrams)
            // JPG/WebP/GIF → images/colours (typically colour swatches)
            string subfolder;
            if (string.Equals(folder, "parts", StringComparison.OrdinalIgnoreCase))
            {
                if (mime == "application/pdf")
                    return BadRequest(new { message = "Part images must be JPG, PNG, WebP or GIF." });
                subfolder = "images/parts";
            }
            else if (mime == "application/pdf")
                subfolder = "images/assemblies";
            else if (mime == "image/png")
                subfolder = "images/assemblies";
            else
                subfolder = "images/colours";

            // ── 6. Ensure WebRootPath is available ────────────────────────────
            var webRoot = _env.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRoot))
            {
                webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
                Directory.CreateDirectory(webRoot);
            }

            var uploadDir = Path.Combine(webRoot, subfolder);
            Directory.CreateDirectory(uploadDir);

            // ── 7. Unique filename to avoid collisions ────────────────────────
            var fileName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadDir, fileName);

            await using var stream = new FileStream(fullPath, FileMode.Create);
            await file.CopyToAsync(stream);

            // ── 8. Return relative path (stored in DB, served as static file) ─
            var relativePath = $"{subfolder}/{fileName}".Replace("\\", "/");

            _logger.LogInformation(
                "File uploaded: {Path} | Type: {Mime} | Size: {Size} bytes",
                relativePath, mime, file.Length);

            return Ok(new { path = relativePath });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Upload failed for file: {FileName}", file.FileName);
            return StatusCode(500, new { message = "Upload failed: " + ex.Message });
        }
    }
}