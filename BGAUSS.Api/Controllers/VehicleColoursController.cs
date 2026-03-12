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
        int updatedCount = 0;
        var skippedRows = new List<int>(); // Optional: track invalid rows

        try
        {
            // Load existing colours from DB
            var existingColours = await _context.VehicleColours
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
                var colourName = worksheet.Cells[row, 1].Text?.Trim();
                if (string.IsNullOrWhiteSpace(colourName))
                {
                    skippedRows.Add(row);
                    continue;
                }

                var modelId = int.TryParse(worksheet.Cells[row, 2].Text, out var mId) ? mId : (int?)null;
                var variantId = int.TryParse(worksheet.Cells[row, 3].Text, out var vId) ? vId : (int?)null;
                var imagePath = worksheet.Cells[row, 4].Text?.Trim();

                // Check if combination already exists
                var existing = existingColours.FirstOrDefault(c =>
                    c.ColourName!.Equals(colourName, StringComparison.OrdinalIgnoreCase) &&
                    c.ModelId == modelId &&
                    c.VariantId == variantId
                );

                if (existing != null)
                {
                    // Update existing record
                    existing.ImagePath = imagePath; // Update image or other fields as needed
                    updatedCount++;
                    continue; // No need to insert
                }

                // Insert new colour
                var newColour = new VehicleColour
                {
                    ColourName = colourName,
                    ModelId = modelId,
                    VariantId = variantId,
                    ImagePath = imagePath
                };

                coloursToInsert.Add(newColour);
            }

            if (coloursToInsert.Any())
                await _context.VehicleColours.AddRangeAsync(coloursToInsert);

            if (coloursToInsert.Any() || updatedCount > 0)
                await _context.SaveChangesAsync();

            var message = $"{coloursToInsert.Count} inserted, {updatedCount} updated.";
            if (skippedRows.Any())
                message += $" Skipped invalid rows: {string.Join(", ", skippedRows)}";

            return Ok(message);
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message;
            return BadRequest($"Import failed: {ex.Message} | SQL Error: {inner}");
        }
    }
}