using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using OfficeOpenXml;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehicleColoursController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public VehicleColoursController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ================= GET ALL =================
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var colours = await _context.VehicleColours.ToListAsync();
        return Ok(colours);
    }

    // ================= GET IMAGE =================
    [HttpGet("image")]
    public async Task<IActionResult> GetImage(int modelId, int variantId, int colourId)
    {
        var colour = await _context.VehicleColours
            .FirstOrDefaultAsync(x =>
                x.ModelId == modelId &&
                x.VariantId == variantId &&
                x.Id == colourId);

        if (colour == null || string.IsNullOrWhiteSpace(colour.ImagePath))
            return NotFound("Image not found");

        // Fix DB path issue (remove spaces/new lines)
        var cleanPath = colour.ImagePath.Replace("\n", "")
                                        .Replace("\r", "")
                                        .Trim();

        var filePath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "wwwroot",
            cleanPath.TrimStart('/')
        );

        if (!System.IO.File.Exists(filePath))
            return NotFound("Image file not found");

        return PhysicalFile(filePath, "image/jpeg");
    }

    // ================= CREATE =================
    [HttpPost]
    public async Task<IActionResult> Create(VehicleColour colour)
    {
        if (string.IsNullOrWhiteSpace(colour.ColourName))
            return BadRequest("ColourName is required.");

        await _context.VehicleColours.AddAsync(colour);
        await _context.SaveChangesAsync();
        return Ok(colour);
    }

    // ================= UPDATE =================
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, VehicleColour updated)
    {
        var colour = await _context.VehicleColours.FindAsync(id);
        if (colour == null) return NotFound();

        colour.ColourName = updated.ColourName;
        colour.ModelId = updated.ModelId;
        colour.VariantId = updated.VariantId;
        colour.ImagePath = updated.ImagePath;

        await _context.SaveChangesAsync();
        return Ok(colour);
    }

    // ================= DELETE =================
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var colour = await _context.VehicleColours.FindAsync(id);
        if (colour == null) return NotFound();

        _context.VehicleColours.Remove(colour);
        await _context.SaveChangesAsync();
        return Ok("Deleted successfully");
    }

    // ================= DOWNLOAD BLANK EXCEL =================
    [HttpGet("download-template")]
    public IActionResult DownloadTemplate()
    {
        using var package = new ExcelPackage();
        var worksheet = package.Workbook.Worksheets.Add("VehicleColoursTemplate");

        // Header row
        worksheet.Cells[1, 1].Value = "ColourName";
        worksheet.Cells[1, 2].Value = "ModelId";
        worksheet.Cells[1, 3].Value = "VariantId";
        worksheet.Cells[1, 4].Value = "ImagePath";

        using (var range = worksheet.Cells[1, 1, 1, 4])
        {
            range.Style.Font.Bold = true;
            range.AutoFitColumns();
        }

        var fileBytes = package.GetAsByteArray();
        var fileName = "VehicleColours_Import_Template.xlsx";

        return File(fileBytes,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileName);
    }

    // ================= IMPORT FROM EXCEL =================
    [HttpPost("import")]
    public async Task<IActionResult> ImportVehicleColours(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var coloursToInsert = new List<VehicleColour>();
        var skippedRows = new List<int>(); // Track skipped rows

        try
        {
            // Load existing combinations to prevent duplicates
            var existingColours = await _context.VehicleColours
                .Select(c => new { c.ColourName, c.ModelId, c.VariantId })
                .ToListAsync();

            var existingSet = new HashSet<string>(
                existingColours.Select(c =>
                    $"{c.ColourName?.Trim()?.ToLower()}_{c.ModelId}_{c.VariantId}")
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
                var colourName = worksheet.Cells[row, 1].Text?.Trim();
                if (string.IsNullOrWhiteSpace(colourName))
                {
                    skippedRows.Add(row);
                    continue;
                }

                var modelId = int.TryParse(worksheet.Cells[row, 2].Text, out var mId) ? mId : (int?)null;
                var variantId = int.TryParse(worksheet.Cells[row, 3].Text, out var vId) ? vId : (int?)null;
                var imagePath = worksheet.Cells[row, 4].Text?.Trim();

                var key = $"{colourName.ToLower()}_{modelId}_{variantId}";

                // Skip if duplicate combination already exists
                if (existingSet.Contains(key))
                {
                    skippedRows.Add(row);
                    continue;
                }

                var colour = new VehicleColour
                {
                    ColourName = colourName,
                    ModelId = modelId,
                    VariantId = variantId,
                    ImagePath = imagePath
                };

                coloursToInsert.Add(colour);
                existingSet.Add(key); // prevent duplicate in same Excel file
            }

            if (coloursToInsert.Any())
            {
                await _context.VehicleColours.AddRangeAsync(coloursToInsert);
                await _context.SaveChangesAsync();
            }

            var message = $"{coloursToInsert.Count} vehicle colours imported successfully.";
            if (skippedRows.Any())
                message += $" Skipped duplicate/invalid rows: {string.Join(", ", skippedRows)}";

            return Ok(message);
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message;
            return BadRequest($"Import failed: {ex.Message} | SQL Error: {inner}");
        }
    }
}