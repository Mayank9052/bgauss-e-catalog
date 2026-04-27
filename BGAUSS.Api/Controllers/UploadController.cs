// Controllers/UploadController.cs
using Microsoft.AspNetCore.Mvc;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<UploadController> _logger;

    public UploadController(IWebHostEnvironment env, ILogger<UploadController> logger)
    {
        _env = env;
        _logger = logger;
    }

    [HttpPost("image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        // Allowed types
        var allowed = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowed.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Only JPG, PNG, WebP, or GIF images are allowed." });

        // Max 10 MB
        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "File size must be under 10 MB." });

        try
        {
            // Determine subfolder from content type
            var subfolder = file.ContentType.Contains("png") ? "images/assemblies"
                          : "images/colours";

            var uploadDir = Path.Combine(_env.WebRootPath, subfolder);
            Directory.CreateDirectory(uploadDir);

            // Unique filename to avoid collisions
            var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
            var fileName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadDir, fileName);

            await using var stream = new FileStream(fullPath, FileMode.Create);
            await file.CopyToAsync(stream);

            // Return relative path (stored in DB, served as static file)
            var relativePath = $"{subfolder}/{fileName}".Replace("\\", "/");

            _logger.LogInformation("Image uploaded: {Path}", relativePath);
            return Ok(new { path = relativePath });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Image upload failed");
            return StatusCode(500, new { message = "Upload failed: " + ex.Message });
        }
    }
}