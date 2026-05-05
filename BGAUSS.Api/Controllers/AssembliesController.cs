using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using BGAUSS.Api.DTOs;
using OfficeOpenXml;

namespace BGAUSS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AssembliesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AssembliesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ================= GET ALL =================
        // Supports filtering by modelId and/or variantId
        // GET /api/assemblies
        // GET /api/assemblies?modelId=1
        // GET /api/assemblies?modelId=1&variantId=2
        [HttpGet]
        public async Task<IActionResult> GetAll(int? modelId, int? variantId)
        {
            var query = _context.Assemblies
                .Include(a => a.Model)
                .Include(a => a.Variant)
                .AsQueryable();

            if (modelId.HasValue)
                query = query.Where(a => a.ModelId == modelId.Value);

            // ── NEW: filter by variantId if provided ──
            // If variantId is supplied, return assemblies that either:
            //   (a) match the exact variantId, OR
            //   (b) have no variantId set (variant-agnostic fallback)
            if (variantId.HasValue)
                query = query.Where(a => a.VariantId == variantId.Value || a.VariantId == null);

            var assemblies = await query
                .OrderBy(a => a.AssemblyName)
                .Select(a => new AssemblyDto
                {
                    Id           = a.Id,
                    AssemblyName = a.AssemblyName,
                    ImagePath    = a.ImagePath,
                    ModelId      = a.ModelId ?? 0,
                    VariantId    = a.VariantId,
                    ModelName    = a.Model != null   ? a.Model.ModelName     : null,
                    VariantName  = a.Variant != null ? a.Variant.VariantName : null,
                })
                .ToListAsync();

            return Ok(assemblies);
        }

        // ================= GET BY ID =================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var assembly = await _context.Assemblies
                .Include(a => a.Model)
                .Include(a => a.Variant)
                .Where(a => a.Id == id)
                .Select(a => new AssemblyDto
                {
                    Id           = a.Id,
                    AssemblyName = a.AssemblyName,
                    ImagePath    = a.ImagePath,
                    ModelId      = a.ModelId ?? 0,
                    VariantId    = a.VariantId,
                    ModelName    = a.Model != null   ? a.Model.ModelName     : null,
                    VariantName  = a.Variant != null ? a.Variant.VariantName : null,
                })
                .FirstOrDefaultAsync();

            if (assembly == null)
                return NotFound();

            return Ok(assembly);
        }

        // ================= GET ASSEMBLY IMAGES BY ModelId (+ optional VariantId) =================
        [HttpGet("images/{modelId}")]
        public async Task<IActionResult> GetImagesByModelId(int modelId, int? variantId)
        {
            var query = _context.Assemblies
                .Where(a => a.ModelId == modelId && !string.IsNullOrWhiteSpace(a.ImagePath));

            if (variantId.HasValue)
                query = query.Where(a => a.VariantId == variantId.Value || a.VariantId == null);

            var assemblies = await query.ToListAsync();

            if (!assemblies.Any())
                return NotFound("No assembly images found for this ModelId");

            var imageUrls = new List<string>();
            var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            foreach (var assembly in assemblies)
            {
                var cleanPath = assembly.ImagePath!
                    .Replace("\n", "").Replace("\r", "").Trim();

                var filePath = Path.Combine(wwwrootPath,
                    cleanPath.Replace("/", Path.DirectorySeparatorChar.ToString()));

                if (System.IO.File.Exists(filePath))
                {
                    var relativeUrl = cleanPath.Replace("\\", "/").TrimStart('/');
                    var url = $"{Request.Scheme}://{Request.Host}/{Uri.EscapeUriString(relativeUrl)}";
                    imageUrls.Add(url);
                }
            }

            if (!imageUrls.Any())
                return NotFound("No assembly images found on server for this ModelId");

            return Ok(imageUrls);
        }

        // ================= CREATE =================
        [HttpPost]
        public async Task<IActionResult> Create(AssemblyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.AssemblyName))
                return BadRequest("Assembly Name is required.");

            var assembly = new Assembly
            {
                AssemblyName = dto.AssemblyName,
                ImagePath    = dto.ImagePath,
                ModelId      = dto.ModelId,
                VariantId    = dto.VariantId,       // ── NEW ──
            };

            _context.Assemblies.Add(assembly);
            await _context.SaveChangesAsync();

            dto.Id = assembly.Id;
            return CreatedAtAction(nameof(GetById), new { id = assembly.Id }, dto);
        }

        // ================= UPDATE =================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, AssemblyDto dto)
        {
            var assembly = await _context.Assemblies.FindAsync(id);
            if (assembly == null) return NotFound();

            assembly.AssemblyName = dto.AssemblyName;
            assembly.ImagePath    = dto.ImagePath;
            assembly.ModelId      = dto.ModelId;
            assembly.VariantId    = dto.VariantId;  // ── NEW ──

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ================= DELETE =================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var assembly = await _context.Assemblies.FindAsync(id);
            if (assembly == null) return NotFound();

            _context.Assemblies.Remove(assembly);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ================= DOWNLOAD BLANK EXCEL TEMPLATE =================
        [HttpGet("download-template")]
        public IActionResult DownloadTemplate()
        {
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("AssembliesTemplate");

            // Header row — added VariantId column
            worksheet.Cells[1, 1].Value = "AssemblyName";
            worksheet.Cells[1, 2].Value = "ImagePath";
            worksheet.Cells[1, 3].Value = "ModelId";
            worksheet.Cells[1, 4].Value = "VariantId";   // ── NEW ──

            using (var range = worksheet.Cells[1, 1, 1, 4])
            {
                range.Style.Font.Bold = true;
                range.AutoFitColumns();
            }

            var fileBytes = package.GetAsByteArray();
            return File(fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Assemblies_Import_Template.xlsx");
        }

        // ================= IMPORT FROM EXCEL =================
        [HttpPost("import")]
        public async Task<IActionResult> ImportAssemblies(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var assembliesToInsert = new List<Assembly>();

            try
            {
                var validModels = new HashSet<int>(
                    await _context.VehicleModels.Select(x => x.Id).ToListAsync()
                );

                // ── NEW: valid variant IDs ──
                var validVariants = new HashSet<int>(
                    await _context.VehicleVariants.Select(v => v.Id).ToListAsync()
                );

                // Load existing assemblies for duplicate check (now keyed by ModelId + VariantId + AssemblyName)
                var existingAssemblies = await _context.Assemblies
                    .Where(a => a.AssemblyName != null && a.ModelId != null)
                    .ToListAsync();

                // Key: (ModelId, VariantId_or_null) → set of assembly names
                var existingKeys = existingAssemblies
                    .GroupBy(a => (a.ModelId!.Value, a.VariantId))
                    .ToDictionary(g => g.Key, g => new HashSet<string>(g.Select(a => a.AssemblyName!)));

                var newKeys = new Dictionary<(int, int?), HashSet<string>>();

                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;

                using var package = new ExcelPackage(stream);
                var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                if (worksheet == null) return BadRequest("Invalid Excel file.");

                int rowCount = worksheet.Dimension.Rows;

                for (int row = 2; row <= rowCount; row++)
                {
                    var name      = worksheet.Cells[row, 1].Text?.Trim();
                    var imagePath = worksheet.Cells[row, 2].Text?.Trim();
                    int modelId   = ParseIntSafe(worksheet.Cells[row, 3].Text);
                    // ── NEW: read VariantId (column 4), nullable ──
                    int? variantId = ParseIntNullable(worksheet.Cells[row, 4].Text);

                    if (string.IsNullOrWhiteSpace(name)) continue;
                    if (!validModels.Contains(modelId))  continue;

                    // VariantId: if provided must be valid; null is allowed (model-only assembly)
                    if (variantId.HasValue && !validVariants.Contains(variantId.Value))
                        variantId = null;

                    var key = (modelId, variantId);

                    if (!newKeys.ContainsKey(key)) newKeys[key] = new HashSet<string>();

                    var existingNames = existingKeys.ContainsKey(key)
                        ? existingKeys[key] : new HashSet<string>();

                    if (existingNames.Contains(name!) || newKeys[key].Contains(name!))
                        continue;

                    assembliesToInsert.Add(new Assembly
                    {
                        AssemblyName = name,
                        ImagePath    = imagePath,
                        ModelId      = modelId,
                        VariantId    = variantId,   // ── NEW ──
                    });

                    newKeys[key].Add(name!);
                }

                if (assembliesToInsert.Any())
                {
                    await _context.Assemblies.AddRangeAsync(assembliesToInsert);
                    await _context.SaveChangesAsync();
                }

                return Ok($"{assembliesToInsert.Count} assemblies imported successfully.");
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException?.Message;
                return BadRequest($"Import failed: {ex.Message} | SQL Error: {inner}");
            }
        }

        // ================= SAFE PARSING HELPERS =================
        private static int ParseIntSafe(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return 0;
            return int.TryParse(value.Trim(), out var result) ? result : 0;
        }

        private static int? ParseIntNullable(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            return int.TryParse(value.Trim(), out var result) ? result : null;
        }
    }
}