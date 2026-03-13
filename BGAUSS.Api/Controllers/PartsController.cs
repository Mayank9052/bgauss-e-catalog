using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using BGAUSS.Api.DTOs;
using OfficeOpenXml;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PartsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ================= GET ALL =================
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var parts = await _context.Parts
            .Select(p => new PartResponse
            {
                Id = p.Id,
                PartNumber = p.PartNumber ?? "",
                PartName = p.PartName ?? "",
                Description = p.Description ?? "",
                Remarks = p.Remarks ?? "",
                Bdp = p.Bdp ?? 0,
                Mrp = p.Mrp ?? 0,
                TaxPercent = p.TaxPercent ?? 0,
                ImagePath = "",
                ImageNumber = p.ImageNumber ?? ""
            })
            .ToListAsync();

        return Ok(parts);
    }

    // ================= GET PARTS BY MODEL + ASSEMBLY =================
    [HttpGet("by-assembly")]
    public async Task<IActionResult> GetPartsByAssembly(int modelId, int assemblyId)
    {
        var parts = await _context.Parts
            .Where(p => p.ModelId == modelId && p.AssemblyId == assemblyId)
            .Select(p => new PartResponse
            {
                Id = p.Id,
                PartNumber = p.PartNumber ?? "",
                PartName = p.PartName ?? "",
                Description = p.Description ?? "",
                Remarks = p.Remarks ?? "",
                Bdp = p.Bdp ?? 0,
                Mrp = p.Mrp ?? 0,
                StockQuantity = p.StockQuantity,
                TaxPercent = p.TaxPercent ?? 0,
                ImagePath = "",
                ImageNumber = p.ImageNumber ?? ""
            })
            .ToListAsync();

        if (!parts.Any())
            return NotFound("No parts found for this assembly.");

        return Ok(parts);
    }

    // ================= CREATE =================
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Part part)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _context.Parts.Add(part);
        await _context.SaveChangesAsync();

        return Ok(part);
    }

    // ================= UPDATE =================
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Part updated)
    {
        var part = await _context.Parts.FindAsync(id);

        if (part == null)
            return NotFound();

        part.PartNumber = updated.PartNumber;
        part.PartName = updated.PartName;
        part.Description = updated.Description;
        part.Remarks = updated.Remarks;
        part.Price = updated.Price;

        part.Bdp = updated.Bdp;
        part.Mrp = updated.Mrp;
        part.TaxPercent = updated.TaxPercent;

        part.StockQuantity = updated.StockQuantity;

        part.AssemblyId = updated.AssemblyId;
        part.ModelId = updated.ModelId;
        part.VariantId = updated.VariantId;
        part.ColourId = updated.ColourId;

        part.TorqueNm = updated.TorqueNm;
        part.ImageNumber = updated.ImageNumber;

        await _context.SaveChangesAsync();

        return Ok(part);
    }

    // ====== Update remarks separately without affecting other fields =====/
    [HttpPut("update-remark/{id}")]
    public async Task<IActionResult> UpdateRemark(int id, [FromBody] UpdateRemarkDto dto)
    {
        if (dto == null)
            return BadRequest("Invalid request");

        var part = await _context.Parts.FindAsync(id);

        if (part == null)
            return NotFound("Part not found");

        part.Remarks = dto.Remark ?? "";

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Remark updated successfully"
        });
    }

    // ================= DELETE =================
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var part = await _context.Parts.FindAsync(id);

        if (part == null)
            return NotFound();

        _context.Parts.Remove(part);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Deleted successfully" });
    }

    // ================= SEARCH =================
    [HttpGet("search")]
    public async Task<IActionResult> Search(string? name, string? partNumber)
    {
        var query = _context.Parts.AsQueryable();

        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(p => p.PartName!.Contains(name));

        if (!string.IsNullOrWhiteSpace(partNumber))
            query = query.Where(p => p.PartNumber!.Contains(partNumber));

        var result = await query
            .Select(p => new PartResponse
            {
                Id = p.Id,
                PartNumber = p.PartNumber ?? "",
                PartName = p.PartName ?? "",
                Description = p.Description ?? "",
                Remarks = p.Remarks ?? "",
                Bdp = p.Bdp ?? 0,
                Mrp = p.Mrp ?? 0,
                TaxPercent = p.TaxPercent ?? 0,
                ImagePath = "",
                ImageNumber = p.ImageNumber ?? ""
            })
            .ToListAsync();

        return Ok(result);
    }

    // ================= DOWNLOAD BLANK EXCEL =================
    [HttpGet("download-template")]
    public IActionResult DownloadTemplate()
    {
        using var package = new ExcelPackage();
        var worksheet = package.Workbook.Worksheets.Add("PartsTemplate");

        // ✅ Header row (same as import)
        worksheet.Cells[1, 1].Value = "PartNumber";
        worksheet.Cells[1, 2].Value = "PartName";
        worksheet.Cells[1, 3].Value = "Description";
        worksheet.Cells[1, 4].Value = "Price";
        worksheet.Cells[1, 5].Value = "Bdp";
        worksheet.Cells[1, 6].Value = "Mrp";
        worksheet.Cells[1, 7].Value = "TaxPercent";
        worksheet.Cells[1, 8].Value = "StockQuantity";
        worksheet.Cells[1, 9].Value = "AssemblyId";
        worksheet.Cells[1, 10].Value = "ModelId";
        worksheet.Cells[1, 11].Value = "VariantId";
        worksheet.Cells[1, 12].Value = "ColourIds"; // multiple CSV like "1,2,3"
        worksheet.Cells[1, 13].Value = "TorqueNm";
        worksheet.Cells[1, 14].Value = "Remarks";
        worksheet.Cells[1, 15].Value = "ImageNumber";

        // ✅ Optional: Set bold header
        using (var range = worksheet.Cells[1, 1, 1, 15])
        {
            range.Style.Font.Bold = true;
            range.AutoFitColumns();
        }

        // Convert package to byte array
        var fileBytes = package.GetAsByteArray();
        var fileName = "Parts_Import_Template.xlsx";

        // Return as file
        return File(fileBytes, 
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                    fileName);
    }

    [HttpPost("import")]
    public async Task<IActionResult> ImportParts(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var package = new ExcelPackage(stream);
            var worksheet = package.Workbook.Worksheets.FirstOrDefault();
            if (worksheet == null) return BadRequest("Invalid Excel file.");

            int rowCount = worksheet.Dimension.Rows;

            // Load existing parts including their colours
            var existingParts = await _context.Parts
                .Include(p => p.PartColours)
                .ToListAsync();

            // Load valid IDs
            var validAssemblies = new HashSet<int>(await _context.Assemblies.Select(x => x.Id).ToListAsync());
            var validModels = new HashSet<int>(await _context.VehicleModels.Select(x => x.Id).ToListAsync());
            var validVariants = new HashSet<int>(await _context.VehicleVariants.Select(x => x.Id).ToListAsync());
            var validColours = new HashSet<int>(await _context.VehicleColours.Select(x => x.Id).ToListAsync());

            int insertedCount = 0;
            int updatedCount = 0;

            for (int row = 2; row <= rowCount; row++)
            {
                var partNumber = worksheet.Cells[row, 1].Text?.Trim();
                if (string.IsNullOrWhiteSpace(partNumber))
                    continue;

                int assemblyId = ParseIntSafe(worksheet.Cells[row, 9].Text);
                int modelId = ParseIntSafe(worksheet.Cells[row, 10].Text);
                int variantId = ParseIntSafe(worksheet.Cells[row, 11].Text);
                var colourText = worksheet.Cells[row, 12].Text?.Trim() ?? "";

                var validColourIds = colourText
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => ParseIntSafe(x))
                    .Where(x => validColours.Contains(x))
                    .ToList();

                // Clean and parse ImageNumber safely as string
                string? imageNumber = worksheet.Cells[row, 15].Text?.Trim();
                if (!string.IsNullOrWhiteSpace(imageNumber))
                {
                    imageNumber = imageNumber.Replace("'", "").Trim(); // remove leading apostrophes
                }
                else
                {
                    imageNumber = null;
                }

                var existingPart = existingParts.FirstOrDefault(p => p.PartNumber == partNumber);

                if (existingPart != null)
                {
                    // ================= UPDATE existing record =================
                    existingPart.PartName = worksheet.Cells[row, 2].Text?.Trim();
                    existingPart.Description = worksheet.Cells[row, 3].Text?.Trim();
                    existingPart.Price = ParseDecimalSafe(worksheet.Cells[row, 4].Text);
                    existingPart.Bdp = ParseDecimalSafe(worksheet.Cells[row, 5].Text);
                    existingPart.Mrp = ParseDecimalSafe(worksheet.Cells[row, 6].Text);
                    existingPart.TaxPercent = ParseDecimalSafe(worksheet.Cells[row, 7].Text);
                    existingPart.StockQuantity = ParseIntSafe(worksheet.Cells[row, 8].Text);
                    existingPart.AssemblyId = validAssemblies.Contains(assemblyId) ? assemblyId : null;
                    existingPart.ModelId = validModels.Contains(modelId) ? modelId : null;
                    existingPart.VariantId = validVariants.Contains(variantId) ? variantId : null;
                    existingPart.TorqueNm = ParseDecimalSafe(worksheet.Cells[row, 13].Text);
                    existingPart.Remarks = worksheet.Cells[row, 14].Text?.Trim();
                    existingPart.ImageNumber = imageNumber;

                    // Update colours
                    existingPart.PartColours.Clear();
                    foreach (var colourId in validColourIds)
                    {
                        existingPart.PartColours.Add(new PartColour { ColourId = colourId });
                    }

                    updatedCount++;
                }
                else
                {
                    // ================= INSERT new record =================
                    var newPart = new Part
                    {
                        PartNumber = partNumber,
                        PartName = worksheet.Cells[row, 2].Text?.Trim(),
                        Description = worksheet.Cells[row, 3].Text?.Trim(),
                        Price = ParseDecimalSafe(worksheet.Cells[row, 4].Text),
                        Bdp = ParseDecimalSafe(worksheet.Cells[row, 5].Text),
                        Mrp = ParseDecimalSafe(worksheet.Cells[row, 6].Text),
                        TaxPercent = ParseDecimalSafe(worksheet.Cells[row, 7].Text),
                        StockQuantity = ParseIntSafe(worksheet.Cells[row, 8].Text),
                        AssemblyId = validAssemblies.Contains(assemblyId) ? assemblyId : null,
                        ModelId = validModels.Contains(modelId) ? modelId : null,
                        VariantId = validVariants.Contains(variantId) ? variantId : null,
                        TorqueNm = ParseDecimalSafe(worksheet.Cells[row, 13].Text),
                        Remarks = worksheet.Cells[row, 14].Text?.Trim(),
                        ImageNumber = imageNumber
                    };

                    foreach (var colourId in validColourIds)
                    {
                        newPart.PartColours.Add(new PartColour { ColourId = colourId });
                    }

                    _context.Parts.Add(newPart);
                    insertedCount++;
                }
            }

            await _context.SaveChangesAsync();

            return Ok($"Import completed: {insertedCount} inserted, {updatedCount} updated.");
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message;
            return BadRequest($"Import failed: {ex.Message} | SQL Error: {inner}");
        }
    }

    // ================= SAFE PARSING METHODS =================
    private decimal ParseDecimalSafe(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return 0;
        value = value.Replace(",", "").Trim();
        return decimal.TryParse(value, out var result) ? result : 0;
    }

    private int ParseIntSafe(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return 0;
        return int.TryParse(value, out var result) ? result : 0;
    }
}
