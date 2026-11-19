// Controllers/ColourMatrixController.cs
// Colour matrix files (Excel .xlsx or PDF) per Model, optionally per Variant / Colour.
//   GET    /api/colour-matrix?modelId&variantId&colourId&includeInactive   list
//   POST   /api/colour-matrix            (Admin, multipart)                 upload
//   PUT    /api/colour-matrix/{id}       (Admin, multipart, file optional)  edit / replace file
//   PATCH  /api/colour-matrix/{id}/status (Admin)                           active / inactive
//   GET    /api/colour-matrix/{id}/preview                                  Excel preview (JSON)
//   GET    /api/colour-matrix/{id}/image/{n}                                picture inside an Excel cell
//   GET    /api/colour-matrix/{id}/file?download=true|false                 view / download original file
// Records are never deleted — they are switched Inactive (same rule as the catalogue).

using BGAUSS.Api.DTOs;
using BGAUSS.Api.Infrastructure;
using BGAUSS.Api.Models;
using BGAUSS.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/colour-matrix")]
public class ColourMatrixController : ControllerBase
{
    private const long MaxFileBytes = 25L * 1024 * 1024;   // 25 MB
    private const string FolderName = "Colour Matrix";

    private static readonly System.Text.Json.JsonSerializerOptions PreviewJson = new(System.Text.Json.JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingDefault,
    };

    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ColourMatrixController> _logger;

    public ColourMatrixController(ApplicationDbContext context, IWebHostEnvironment env, ILogger<ColourMatrixController> logger)
    {
        _context = context;
        _env = env;
        _logger = logger;
    }

    // ================= LIST =================
    [HttpGet]
    public async Task<IActionResult> GetAll(int? modelId, int? variantId, int? colourId, bool includeInactive = false)
    {
        var showInactive = User.CanSeeInactive(includeInactive);
        var q = _context.ColourMatrices.AsNoTracking().AsQueryable();
        if (!showInactive) q = q.Where(m => m.IsActive);

        if (modelId.HasValue)
        {
            q = q.Where(m => m.ModelId == modelId.Value);
            // A catalogue page asks for its exact configuration: show matrices for the whole
            // model plus those narrowed to this variant / colour.
            if (variantId.HasValue) q = q.Where(m => m.VariantId == null || m.VariantId == variantId.Value);
            if (colourId.HasValue)  q = q.Where(m => m.ColourId == null || m.ColourId == colourId.Value);
        }

        var list = await q
            .OrderBy(m => m.Model!.ModelName)
            .ThenByDescending(m => m.ColourId != null)      // most specific first
            .ThenByDescending(m => m.VariantId != null)
            .ThenByDescending(m => m.UploadedAt)
            .Select(m => new ColourMatrixDto
            {
                Id = m.Id,
                ModelId = m.ModelId,
                ModelName = m.Model!.ModelName,
                VariantId = m.VariantId,
                VariantName = m.Variant != null ? m.Variant.VariantName : null,
                ColourId = m.ColourId,
                ColourName = m.Colour != null ? m.Colour.ColourName : null,
                Title = m.Title,
                OriginalFileName = m.OriginalFileName,
                FileType = m.FileType,
                FileSize = m.FileSize,
                IsActive = m.IsActive,
                UploadedAt = m.UploadedAt,
                UploadedBy = m.UploadedBy,
            })
            .ToListAsync();

        return Ok(list);
    }

    // ================= UPLOAD =================
    [HttpPost]
    [RequestSizeLimit(MaxFileBytes + 1024 * 1024)]
    public async Task<IActionResult> Create([FromForm] ColourMatrixFormDto form)
    {
        if (!User.IsAdmin()) return Forbid();
        if (form.File == null || form.File.Length == 0) return BadRequest("Please choose an Excel (.xlsx) or PDF file.");

        var error = await ValidateMappingAsync(form.ModelId, form.VariantId, form.ColourId);
        if (error != null) return BadRequest(error);

        var (saved, fileError) = await SaveFileAsync(form.File);
        if (fileError != null) return BadRequest(fileError);

        var entity = new ColourMatrix
        {
            ModelId = form.ModelId,
            VariantId = form.VariantId,
            ColourId = form.ColourId,
            Title = await TitleOrDefaultAsync(form.Title, form.ModelId, form.VariantId, form.ColourId),
            FilePath = saved!.WebPath,
            OriginalFileName = saved.OriginalName,
            FileType = saved.Type,
            FileSize = saved.Size,
            IsActive = true,
            UploadedAt = DateTime.UtcNow,
            UploadedBy = User.Identity?.Name,
        };
        _context.ColourMatrices.Add(entity);
        await _context.SaveChangesAsync();
        return Ok(new { id = entity.Id });
    }

    // ================= EDIT / REPLACE FILE =================
    [HttpPut("{id:int}")]
    [RequestSizeLimit(MaxFileBytes + 1024 * 1024)]
    public async Task<IActionResult> Update(int id, [FromForm] ColourMatrixFormDto form)
    {
        if (!User.IsAdmin()) return Forbid();
        var entity = await _context.ColourMatrices.FindAsync(id);
        if (entity == null) return NotFound();

        var error = await ValidateMappingAsync(form.ModelId, form.VariantId, form.ColourId);
        if (error != null) return BadRequest(error);

        if (form.File != null && form.File.Length > 0)
        {
            var (saved, fileError) = await SaveFileAsync(form.File);
            if (fileError != null) return BadRequest(fileError);
            // the previous file stays on disk (nothing is deleted); the record now points to the new one
            entity.FilePath = saved!.WebPath;
            entity.OriginalFileName = saved.OriginalName;
            entity.FileType = saved.Type;
            entity.FileSize = saved.Size;
            entity.UploadedAt = DateTime.UtcNow;
            entity.UploadedBy = User.Identity?.Name;
        }

        entity.ModelId = form.ModelId;
        entity.VariantId = form.VariantId;
        entity.ColourId = form.ColourId;
        entity.Title = await TitleOrDefaultAsync(form.Title, form.ModelId, form.VariantId, form.ColourId);
        await _context.SaveChangesAsync();
        return Ok(new { id = entity.Id });
    }

    // ================= STATUS =================
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] StatusUpdateDto dto)
    {
        if (!User.IsAdmin()) return Forbid();
        var entity = await _context.ColourMatrices.FindAsync(id);
        if (entity == null) return NotFound();
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        return Ok(new { id = entity.Id, isActive = entity.IsActive });
    }

    // ================= EXCEL PREVIEW =================
    [HttpGet("{id:int}/preview")]
    public async Task<IActionResult> Preview(int id)
    {
        var (entity, path) = await FindReadableAsync(id);
        if (entity == null || path == null) return NotFound();
        if (entity.FileType != "xlsx") return BadRequest("Preview is only available for Excel files.");
        try
        {
            // empty / default values are left out to keep the response small
            return new JsonResult(XlsxPreviewReader.Read(path), PreviewJson);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Colour matrix {Id} could not be read as Excel", id);
            return UnprocessableEntity("This Excel file could not be read. Please download it instead.");
        }
    }

    [HttpGet("{id:int}/image/{index:int}")]
    public async Task<IActionResult> CellImage(int id, int index)
    {
        var (entity, path) = await FindReadableAsync(id);
        if (entity == null || path == null || entity.FileType != "xlsx") return NotFound();
        var img = XlsxPreviewReader.ReadImage(path, index);
        if (img == null) return NotFound();
        Response.Headers.CacheControl = "private, max-age=86400";
        return File(img.Value.Data, img.Value.ContentType);
    }

    // ================= VIEW / DOWNLOAD ORIGINAL =================
    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> GetFile(int id, bool download = false)
    {
        var (entity, path) = await FindReadableAsync(id);
        if (entity == null || path == null) return NotFound();
        var type = entity.FileType == "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        var stream = System.IO.File.OpenRead(path);
        if (download) return File(stream, type, entity.OriginalFileName);
        // inline (PDF opens in the browser's viewer)
        Response.Headers.ContentDisposition = $"inline; filename*=UTF-8''{Uri.EscapeDataString(entity.OriginalFileName)}";
        return File(stream, type);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private async Task<(ColourMatrix? entity, string? path)> FindReadableAsync(int id)
    {
        var entity = await _context.ColourMatrices.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
        if (entity == null) return (null, null);
        if (!entity.IsActive && !User.IsAdmin()) return (null, null);
        var path = PhysicalPath(entity.FilePath);
        return path != null && System.IO.File.Exists(path) ? (entity, path) : (entity, null);
    }

    /// <summary>Maps a stored web path ("/Colour Matrix/x.xlsx") to a file inside wwwroot only.</summary>
    private string? PhysicalPath(string webPath)
    {
        var root = Path.GetFullPath(WebRoot());
        var full = Path.GetFullPath(Path.Combine(root, webPath.TrimStart('/', '\\')));
        return full.StartsWith(root, StringComparison.OrdinalIgnoreCase) ? full : null;
    }

    private string WebRoot() => _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");

    private async Task<string?> ValidateMappingAsync(int modelId, int? variantId, int? colourId)
    {
        if (modelId <= 0 || !await _context.VehicleModels.AnyAsync(m => m.Id == modelId))
            return "Please select a valid model.";

        if (variantId.HasValue)
        {
            var variant = await _context.VehicleVariants.AsNoTracking().FirstOrDefaultAsync(v => v.Id == variantId.Value);
            if (variant == null) return "The selected variant does not exist.";
            if (variant.ModelId != modelId) return "The selected variant does not belong to the selected model.";
        }

        if (colourId.HasValue)
        {
            var colour = await _context.VehicleColours.AsNoTracking().FirstOrDefaultAsync(c => c.Id == colourId.Value);
            if (colour == null) return "The selected colour does not exist.";
            if (colour.ModelId.HasValue && colour.ModelId != modelId) return "The selected colour does not belong to the selected model.";
            if (variantId.HasValue && colour.VariantId.HasValue && colour.VariantId != variantId)
                return "The selected colour does not belong to the selected variant.";
        }
        return null;
    }

    private async Task<string> TitleOrDefaultAsync(string? title, int modelId, int? variantId, int? colourId)
    {
        if (!string.IsNullOrWhiteSpace(title)) return title.Trim().Length > 200 ? title.Trim()[..200] : title.Trim();
        var model = await _context.VehicleModels.Where(m => m.Id == modelId).Select(m => m.ModelName).FirstOrDefaultAsync();
        var variant = variantId.HasValue ? await _context.VehicleVariants.Where(v => v.Id == variantId).Select(v => v.VariantName).FirstOrDefaultAsync() : null;
        var colour = colourId.HasValue ? await _context.VehicleColours.Where(c => c.Id == colourId).Select(c => c.ColourName).FirstOrDefaultAsync() : null;
        return string.Join(" · ", new[] { model, variant, colour }.Where(s => !string.IsNullOrWhiteSpace(s))) + " — Colour Matrix";
    }

    private sealed record SavedFile(string WebPath, string OriginalName, string Type, long Size);

    private async Task<(SavedFile? file, string? error)> SaveFileAsync(IFormFile file)
    {
        if (file.Length > MaxFileBytes) return (null, "The file is larger than 25 MB.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var type = ext switch { ".xlsx" => "xlsx", ".pdf" => "pdf", _ => null };
        if (type == null)
            return (null, ext == ".xls"
                ? "Old Excel (.xls) files are not supported. Open the file in Excel and save it as .xlsx."
                : "Only Excel (.xlsx) and PDF files are allowed.");

        // check the real file signature, not just the name
        var head = new byte[5];
        await using (var s = file.OpenReadStream())
        {
            var read = await s.ReadAsync(head.AsMemory(0, 5));
            var ok = type == "pdf"
                ? read >= 5 && head[0] == '%' && head[1] == 'P' && head[2] == 'D' && head[3] == 'F'
                : read >= 2 && head[0] == 'P' && head[1] == 'K';
            if (!ok) return (null, type == "pdf" ? "This file is not a valid PDF." : "This file is not a valid Excel (.xlsx) workbook.");
        }

        var folder = Path.Combine(WebRoot(), FolderName);
        Directory.CreateDirectory(folder);

        var original = Path.GetFileName(file.FileName);
        var baseName = Path.GetFileNameWithoutExtension(original);
        var safe = new string(baseName.Select(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' ? ch : '_').ToArray()).Trim('_');
        if (safe.Length == 0) safe = "colour_matrix";
        if (safe.Length > 80) safe = safe[..80];
        var name = $"{safe}_{DateTime.UtcNow:yyyyMMddHHmmss}{ext}";

        await using (var outStream = System.IO.File.Create(Path.Combine(folder, name)))
            await file.CopyToAsync(outStream);

        return (new SavedFile($"/{FolderName}/{name}", original.Length > 260 ? original[^260..] : original, type, file.Length), null);
    }
}
