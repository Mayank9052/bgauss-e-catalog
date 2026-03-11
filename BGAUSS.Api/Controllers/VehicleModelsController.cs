using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using OfficeOpenXml;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehicleModelsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public VehicleModelsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ================= GET ALL =================
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var models = await _context.VehicleModels.ToListAsync();
        return Ok(models);
    }

    // ================= CREATE =================
    [HttpPost]
    public async Task<IActionResult> Create(VehicleModel model)
    {
        if (string.IsNullOrWhiteSpace(model.ModelName))
            return BadRequest("ModelName is required.");

        await _context.VehicleModels.AddAsync(model);
        await _context.SaveChangesAsync();
        return Ok(model);
    }

    // ================= UPDATE =================
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, VehicleModel updated)
    {
        var model = await _context.VehicleModels.FindAsync(id);
        if (model == null) return NotFound();

        model.ModelName = updated.ModelName;
        await _context.SaveChangesAsync();
        return Ok(model);
    }

    // ================= DELETE =================
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var model = await _context.VehicleModels.FindAsync(id);
        if (model == null) return NotFound();

        _context.VehicleModels.Remove(model);
        await _context.SaveChangesAsync();
        return Ok("Deleted successfully");
    }

    // ================= DOWNLOAD BLANK EXCEL =================
    [HttpGet("download-template")]
    public IActionResult DownloadTemplate()
    {
        using var package = new ExcelPackage();
        var worksheet = package.Workbook.Worksheets.Add("VehicleModelsTemplate");

        // Header row
        worksheet.Cells[1, 1].Value = "ModelName";

        using (var range = worksheet.Cells[1, 1, 1, 1])
        {
            range.Style.Font.Bold = true;
            range.AutoFitColumns();
        }

        var fileBytes = package.GetAsByteArray();
        var fileName = "VehicleModels_Import_Template.xlsx";

        return File(fileBytes,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileName);
    }

    // ================= IMPORT FROM EXCEL =================
    [HttpPost("import")]
    public async Task<IActionResult> ImportVehicleModels(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var modelsToInsert = new List<VehicleModel>();

        try
        {
            // Existing model names to avoid duplicates
            var existingNames = new HashSet<string>(
                await _context.VehicleModels
                    .Where(m => m.ModelName != null)
                    .Select(m => m.ModelName!)
                    .ToListAsync()
            );

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
                var modelName = worksheet.Cells[row, 1].Text?.Trim();
                if (string.IsNullOrWhiteSpace(modelName))
                    continue;

                // Skip duplicates in DB
                if (existingNames.Contains(modelName))
                    continue;

                var model = new VehicleModel
                {
                    ModelName = modelName
                };

                modelsToInsert.Add(model);
            }

            if (modelsToInsert.Any())
            {
                // Ensure EF does not attempt to set Id
                foreach (var model in modelsToInsert)
                {
                    model.Id = 0; // EF will generate Id automatically
                }

                await _context.VehicleModels.AddRangeAsync(modelsToInsert);
                await _context.SaveChangesAsync();
            }

            return Ok($"{modelsToInsert.Count} vehicle models imported successfully.");
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message;
            return BadRequest($"Import failed: {ex.Message} | SQL Error: {inner}");
        }
    }
}