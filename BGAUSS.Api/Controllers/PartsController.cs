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

    // ✅ GET ALL PARTS
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var parts = await _context.Parts
            .Include(p => p.Category)
            .Select(p => new PartResponse
            {
                Id = p.Id,
                PartNumber = p.PartNumber ?? string.Empty,
                PartName = p.PartName ?? string.Empty,
                Description = p.Description ?? string.Empty,
                BDP = p.BDP ?? 0,
                MRP = p.MRP ?? 0,
                TaxPercent = p.TaxPercent ?? 0,
                PageReference = p.PageReference ?? string.Empty,
                ImagePath = p.ImagePath ?? string.Empty,
                CategoryName = p.Category != null ? p.Category.CategoryName ?? string.Empty : string.Empty
            })
            .ToListAsync();

        return Ok(parts);
    }

    // ✅ CREATE PART
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Part part)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _context.Parts.Add(part);
        await _context.SaveChangesAsync();

        return Ok(part);
    }

    // ✅ UPDATE PART
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Part updated)
    {
        var part = await _context.Parts.FindAsync(id);
        if (part == null)
            return NotFound();

        part.PartName = updated.PartName;
        part.PartNumber = updated.PartNumber;
        part.Description = updated.Description;

        part.BDP = updated.BDP ?? 0;
        part.MRP = updated.MRP ?? 0;
        part.TaxPercent = updated.TaxPercent ?? 0;

        part.PageReference = updated.PageReference;
        part.ImagePath = updated.ImagePath;
        part.CategoryId = updated.CategoryId;

        await _context.SaveChangesAsync();

        return Ok(part);
    }

    // ✅ DELETE
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

    // ✅ SEARCH
    [HttpGet("search")]
    public async Task<IActionResult> Search(string? name, string? partNumber)
    {
        var query = _context.Parts
            .Include(p => p.Category)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(p => p.PartName != null && p.PartName.Contains(name.Trim()));

        if (!string.IsNullOrWhiteSpace(partNumber))
            query = query.Where(p => p.PartNumber != null && p.PartNumber.Contains(partNumber.Trim()));

        var result = await query
            .Select(p => new PartResponse
            {
                Id = p.Id,
                PartNumber = p.PartNumber ?? string.Empty,
                PartName = p.PartName ?? string.Empty,
                Description = p.Description ?? string.Empty,
                BDP = p.BDP ?? 0,
                MRP = p.MRP ?? 0,
                TaxPercent = p.TaxPercent ?? 0,
                PageReference = p.PageReference ?? string.Empty,
                ImagePath = p.ImagePath ?? string.Empty,
                CategoryName = p.Category != null ? p.Category.CategoryName ?? string.Empty : string.Empty
            })
            .ToListAsync();

        return Ok(result);
    }

    // ✅ IMPORT PARTS
    [HttpPost("import")]
    public async Task<IActionResult> ImportParts(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var partsToInsert = new List<Part>();

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        stream.Position = 0;

        using var package = new ExcelPackage(stream);
        var worksheet = package.Workbook.Worksheets.FirstOrDefault();

        if (worksheet == null)
            return BadRequest("Invalid Excel file.");

        var rowCount = worksheet.Dimension.Rows;

        var existingPartNumbers = await _context.Parts
            .Select(p => p.PartNumber)
            .ToListAsync();

        for (int row = 2; row <= rowCount; row++)
        {
            var partNumber = worksheet.Cells[row, 2].Text?.Trim();
            if (string.IsNullOrWhiteSpace(partNumber))
                continue;

            if (existingPartNumbers.Contains(partNumber))
                continue;

            decimal bdp = ParseDecimalSafe(worksheet.Cells[row, 5].Text);
            decimal mrp = ParseDecimalSafe(worksheet.Cells[row, 6].Text);
            decimal tax = ParseDecimalSafe(worksheet.Cells[row, 7].Text);

            var part = new Part
            {
                PartNumber = partNumber,
                PartName = worksheet.Cells[row, 3].Text?.Trim() ?? string.Empty,
                Description = worksheet.Cells[row, 3].Text?.Trim() ?? string.Empty,
                PageReference = worksheet.Cells[row, 4].Text?.Trim() ?? string.Empty,
                BDP = bdp,
                MRP = mrp,
                TaxPercent = tax,
                Price = mrp,
                CategoryId = 1
            };

            partsToInsert.Add(part);
        }

        if (partsToInsert.Any())
        {
            _context.Parts.AddRange(partsToInsert);
            await _context.SaveChangesAsync();
        }

        return Ok($"{partsToInsert.Count} parts imported successfully.");
    }

    private decimal ParseDecimalSafe(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return 0;

        value = value.Replace(",", "").Trim();

        return decimal.TryParse(value, out var result) ? result : 0;
    }

    [HttpPost("import-assembly")]
    public async Task<IActionResult> ImportAssembly(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        stream.Position = 0;

        using var package = new ExcelPackage(stream);
        var worksheet = package.Workbook.Worksheets.FirstOrDefault();

        if (worksheet == null)
            return BadRequest("Invalid file.");

        var rowCount = worksheet.Dimension.Rows;

        for (int row = 2; row <= rowCount; row++)
        {
            var assemblyName = worksheet.Cells[row, 1].Text?.Trim();
            var imageNo = worksheet.Cells[row, 2].Text?.Trim();
            var partNumber = worksheet.Cells[row, 3].Text?.Trim();
            var partName = worksheet.Cells[row, 4].Text?.Trim();
            var qty = int.TryParse(worksheet.Cells[row, 5].Text, out var q) ? q : 0;
            var frt = worksheet.Cells[row, 6].Text?.Trim();
            var remark = worksheet.Cells[row, 7].Text?.Trim();
            var erp = worksheet.Cells[row, 8].Text?.Trim();

            if (string.IsNullOrWhiteSpace(partNumber))
                continue;

            // 🔥 1. Create Assembly if not exists
            var assembly = await _context.Assemblies
                .FirstOrDefaultAsync(a => a.AssemblyName == assemblyName);

            if (assembly == null)
            {
                assembly = new Assembly
                {
                    AssemblyName = assemblyName,
                    ImageNo = imageNo
                };

                _context.Assemblies.Add(assembly);
                await _context.SaveChangesAsync();
            }

            // 🔥 2. Get Part
            var part = await _context.Parts
                .FirstOrDefaultAsync(p => p.PartNumber == partNumber);

            if (part == null)
                continue; // skip if part not exists

            // 🔥 3. Insert Mapping
            var assemblyPart = new AssemblyPart
            {
                AssemblyId = assembly.Id,
                PartId = part.Id,
                Quantity = qty,
                FRT = frt,
                Remark = remark,
                ERP = erp
            };

            _context.AssemblyParts.Add(assemblyPart);
        }

        await _context.SaveChangesAsync();

        return Ok("Assembly data imported successfully.");
    }
}