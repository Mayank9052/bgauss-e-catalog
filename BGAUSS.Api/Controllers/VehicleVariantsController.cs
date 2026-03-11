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

    // ================= CREATE =================
    [HttpPost("import")]
    public async Task<IActionResult> ImportVariants(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var variantsToInsert = new List<VehicleVariant>();

        try
        {
            // Valid Model IDs
            var validModelIds = new HashSet<int>(
                await _context.VehicleModels.Select(m => m.Id).ToListAsync()
            );

            // Existing variants grouped by ModelId
            var existingVariantsList = await _context.VehicleVariants
                .Where(v => v.VariantName != null && v.ModelId != null)
                .ToListAsync();

            var existingByModel = existingVariantsList
                .GroupBy(v => v.ModelId.Value)
                .ToDictionary(
                    g => g.Key,
                    g => new HashSet<string>(g.Select(v => v.VariantName!))
                );

            var newNamesByModel = new Dictionary<int, HashSet<string>>();

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var package = new OfficeOpenXml.ExcelPackage(stream);
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

                if (!newNamesByModel.ContainsKey(modelId))
                    newNamesByModel[modelId] = new HashSet<string>();

                var existingNamesForModel = existingByModel.ContainsKey(modelId)
                    ? existingByModel[modelId]
                    : new HashSet<string>();

                var newNamesForModel = newNamesByModel[modelId];

                // Skip if variant already exists for this model
                if (existingNamesForModel.Contains(variantName) || newNamesForModel.Contains(variantName))
                    continue;

                // IMPORTANT: Do NOT set Id
                var variant = new VehicleVariant
                {
                    VariantName = variantName,
                    ModelId = modelId
                };

                variantsToInsert.Add(variant);
                newNamesForModel.Add(variantName);
            }

            if (variantsToInsert.Any())
            {
                await _context.VehicleVariants.AddRangeAsync(variantsToInsert);
                await _context.SaveChangesAsync();
            }

            return Ok($"{variantsToInsert.Count} vehicle variants imported successfully.");
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message;
            return BadRequest($"Import failed: {ex.Message} | SQL Error: {inner}");
        }
    }
}