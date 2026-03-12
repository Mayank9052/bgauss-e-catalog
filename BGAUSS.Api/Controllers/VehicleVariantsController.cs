using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using OfficeOpenXml;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehicleVariantsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public VehicleVariantsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ================= GET ALL =================
    [HttpGet]
    public async Task<IActionResult> GetAll(int? modelId)
    {
        IQueryable<VehicleVariant> query = _context.VehicleVariants;

        if (modelId.HasValue)
            query = query.Where(v => v.ModelId == modelId.Value);

        var variants = await query.ToListAsync();
        return Ok(variants);
    }

    // ================= GET BY MODEL =================
    [HttpGet("by-model/{modelId}")]
    public async Task<IActionResult> GetByModel(int modelId)
    {
        var variants = await _context.VehicleVariants
            .Where(v => v.ModelId == modelId)
            .ToListAsync();

        return Ok(variants);
    }

    // ================= DOWNLOAD EXCEL TEMPLATE =================
    [HttpGet("download-template")]
    public IActionResult DownloadTemplate()
    {
        using var package = new ExcelPackage();
        var worksheet = package.Workbook.Worksheets.Add("VehicleVariantsTemplate");

        // ✅ Header row
        worksheet.Cells[1, 1].Value = "VariantName";
        worksheet.Cells[1, 2].Value = "ModelId";

        // Optional: make headers bold
        using (var range = worksheet.Cells[1, 1, 1, 2])
        {
            range.Style.Font.Bold = true;
            range.AutoFitColumns();
        }

        var fileBytes = package.GetAsByteArray();
        var fileName = "VehicleVariants_Import_Template.xlsx";

        return File(fileBytes, 
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                    fileName);
    }

    // ================= CREATE / IMPORT WITH UPSERT =================
    [HttpPost("import")]
    public async Task<IActionResult> ImportVariants(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var variantsToInsert = new List<VehicleVariant>();
        int updatedCount = 0;

        try
        {
            // Valid Model IDs
            var validModelIds = new HashSet<int>(
                await _context.VehicleModels.Select(m => m.Id).ToListAsync()
            );

            // Load existing variants
            var existingVariants = await _context.VehicleVariants
                .Where(v => v.VariantName != null && v.ModelId != null)
                .ToListAsync();

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
                var variantName = worksheet.Cells[row, 1].Text?.Trim();
                if (string.IsNullOrWhiteSpace(variantName))
                    continue;

                int modelId = int.TryParse(worksheet.Cells[row, 2].Text, out var mId) && validModelIds.Contains(mId) ? mId : 0;
                if (modelId == 0)
                    continue;

                // Check if variant exists
                var existingVariant = existingVariants.FirstOrDefault(v => v.ModelId == modelId && v.VariantName == variantName);

                if (existingVariant != null)
                {
                    // You can update additional columns here if needed
                    updatedCount++;
                    continue; // Skip adding, already exists
                }

                // Insert new variant
                variantsToInsert.Add(new VehicleVariant
                {
                    VariantName = variantName,
                    ModelId = modelId
                });
            }

            if (variantsToInsert.Any())
            {
                await _context.VehicleVariants.AddRangeAsync(variantsToInsert);
            }

            if (variantsToInsert.Any() || updatedCount > 0)
                await _context.SaveChangesAsync();

            return Ok($"{variantsToInsert.Count} inserted, {updatedCount} already existed and skipped/updated.");
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message;
            return BadRequest($"Import failed: {ex.Message} | SQL Error: {inner}");
        }
    }
}