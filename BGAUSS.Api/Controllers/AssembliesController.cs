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

        // GET ALL
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var assemblies = await _context.Assemblies
                .Select(a => new AssemblyDto
                {
                    Id = a.Id,
                    AssemblyName = a.AssemblyName,
                    ImagePath = a.ImagePath,
                    ModelId = a.ModelId
                })
                .ToListAsync();

            return Ok(assemblies);
        }

        // GET BY ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var assembly = await _context.Assemblies
                .Where(a => a.Id == id)
                .Select(a => new AssemblyDto
                {
                    Id = a.Id,
                    AssemblyName = a.AssemblyName,
                    ImagePath = a.ImagePath,
                    ModelId = a.ModelId
                })
                .FirstOrDefaultAsync();

            if (assembly == null)
                return NotFound();

            return Ok(assembly);
        }

        // GET all Assembly images by ModelId
        [HttpGet("images/{modelId}")]
        public async Task<IActionResult> GetImagesByModelId(int modelId)
        {
            // Fetch assemblies for this ModelId
            var assemblies = await _context.Assemblies
                .Where(a => a.ModelId == modelId && !string.IsNullOrEmpty(a.ImagePath))
                .ToListAsync();

            if (!assemblies.Any())
                return NotFound("No assembly images found for this ModelId");

            var imageUrls = new List<string>();
            var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            foreach (var assembly in assemblies)
            {
                // Clean DB path
                var cleanPath = assembly.ImagePath.Replace("\n", "")
                                                .Replace("\r", "")
                                                .Trim();

                // Physical file path
                var filePath = Path.Combine(wwwrootPath, cleanPath.TrimStart('/'));

                // Only add if the file exists
                if (System.IO.File.Exists(filePath))
                {
                    var url = $"{Request.Scheme}://{Request.Host}/{cleanPath.Replace("\\", "/").TrimStart('/')}";
                    imageUrls.Add(url);
                }
            }

            if (!imageUrls.Any())
                return NotFound("No assembly images found on server for this ModelId");

            return Ok(imageUrls);
        }

        // CREATE
        [HttpPost]
        public async Task<IActionResult> Create(AssemblyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.AssemblyName))
                return BadRequest("Assembly Name is required.");

            var assembly = new Assembly
            {
                AssemblyName = dto.AssemblyName,
                ImagePath = dto.ImagePath,
                ModelId = dto.ModelId
            };

            _context.Assemblies.Add(assembly);
            await _context.SaveChangesAsync();

            dto.Id = assembly.Id;

            return CreatedAtAction(nameof(GetById), new { id = assembly.Id }, dto);
        }

        // UPDATE
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, AssemblyDto dto)
        {
            var assembly = await _context.Assemblies.FindAsync(id);

            if (assembly == null)
                return NotFound();

            assembly.AssemblyName = dto.AssemblyName;
            assembly.ImagePath = dto.ImagePath;
            assembly.ModelId = dto.ModelId;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var assembly = await _context.Assemblies.FindAsync(id);

            if (assembly == null)
                return NotFound();

            _context.Assemblies.Remove(assembly);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ================= DOWNLOAD BLANK EXCEL =================
        [HttpGet("download-template")]
        public IActionResult DownloadTemplate()
        {
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("AssembliesTemplate");

            // Header row
            worksheet.Cells[1, 1].Value = "AssemblyName";
            worksheet.Cells[1, 2].Value = "ImagePath";
            worksheet.Cells[1, 3].Value = "ModelId";

            using (var range = worksheet.Cells[1, 1, 1, 3])
            {
                range.Style.Font.Bold = true;
                range.AutoFitColumns();
            }

            var fileBytes = package.GetAsByteArray();
            var fileName = "Assemblies_Import_Template.xlsx";

            return File(fileBytes,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        fileName);
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
                // Valid Model IDs
                var validModels = new HashSet<int>(
                    await _context.VehicleModels.Select(x => x.Id).ToListAsync()
                );

                // Load existing assemblies as dictionary by ModelId for per-model duplicate check
                var existingAssemblies = await _context.Assemblies
                    .Where(a => a.AssemblyName != null && a.ModelId != null)
                    .ToListAsync();

                var existingByModel = existingAssemblies
                    .GroupBy(a => a.ModelId.Value)
                    .ToDictionary(g => g.Key, g => new HashSet<string>(g.Select(a => a.AssemblyName!)));

                // Track new names in Excel per modelId to avoid duplicates within file
                var newNamesByModel = new Dictionary<int, HashSet<string>>();

                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;

                using var package = new ExcelPackage(stream);
                var worksheet = package.Workbook.Worksheets.FirstOrDefault();

                if (worksheet == null)
                    return BadRequest("Invalid Excel file.");

                int rowCount = worksheet.Dimension.Rows;

                for (int row = 2; row <= rowCount; row++)
                {
                    var name = worksheet.Cells[row, 1].Text?.Trim();
                    var imagePath = worksheet.Cells[row, 2].Text?.Trim();
                    int modelId = ParseIntSafe(worksheet.Cells[row, 3].Text);

                    if (string.IsNullOrWhiteSpace(name))
                        continue;

                    if (!validModels.Contains(modelId))
                        continue;

                    // Initialize tracking for this model
                    if (!newNamesByModel.ContainsKey(modelId))
                        newNamesByModel[modelId] = new HashSet<string>();

                    var existingNamesForModel = existingByModel.ContainsKey(modelId)
                        ? existingByModel[modelId]
                        : new HashSet<string>();

                    var newNamesForModel = newNamesByModel[modelId];

                    // Skip if AssemblyName already exists for this ModelId
                    if (existingNamesForModel.Contains(name) || newNamesForModel.Contains(name))
                        continue;

                    var assembly = new Assembly
                    {
                        AssemblyName = name,
                        ImagePath = imagePath,
                        ModelId = modelId
                    };

                    assembliesToInsert.Add(assembly);
                    newNamesForModel.Add(name); // track this name for Excel duplicates per ModelId
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

        // ================= SAFE PARSING METHODS =================
        private int ParseIntSafe(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return 0;

            return int.TryParse(value.Trim(), out var result) ? result : 0;
        }
    }
}