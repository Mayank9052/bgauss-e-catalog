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
        .Include(p => p.PartColours)
        .Select(p => new
            {
                    id             = p.Id,
            partNumber     = p.PartNumber ?? "",
            partName       = p.PartName ?? "",
            description    = p.Description ?? "",
            remarks        = p.Remarks ?? "",
            price          = p.Price ?? 0,
            bdp            = p.Bdp ?? 0,
            mrp            = p.Mrp ?? 0,
            taxPercent     = p.TaxPercent ?? 0,
            stockQuantity  = p.StockQuantity ?? "",
            assemblyId     = p.AssemblyId,
            modelId        = p.ModelId,
            variantId      = p.VariantId,
            torqueNm       = p.TorqueNm ?? 0,
            imageNumber    = p.ImageNumber ?? "",
            colourIds      = string.Join(",", p.PartColours.Select(pc => pc.ColourId))
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
            .Select(p => new
            {
                id            = p.Id,
                partNumber    = p.PartNumber    ?? "",
                partName      = p.PartName      ?? "",
                description   = p.Description   ?? "",
                remarks       = p.Remarks       ?? "",
                price         = p.Price         ?? 0m,
                bdp           = p.Bdp           ?? 0m,
                mrp           = p.Mrp           ?? 0m,
                taxPercent    = p.TaxPercent    ?? 0m,
                stockQuantity = p.StockQuantity ?? "",
                assemblyId    = p.AssemblyId,
                modelId       = p.ModelId,
                variantId     = p.VariantId,
                torqueNm      = p.TorqueNm      ?? 0m,
                imageNumber   = p.ImageNumber   ?? "",
                imagePath     = "",
                categoryName  = "",
            })
            .ToListAsync();

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

        part.StockQuantity = updated.StockQuantity ?? "";

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
        var query = _context.Parts.Include(p => p.PartColours).AsQueryable();

    if (!string.IsNullOrWhiteSpace(name))
        query = query.Where(p => p.PartName!.Contains(name));

    if (!string.IsNullOrWhiteSpace(partNumber))
        query = query.Where(p => p.PartNumber!.Contains(partNumber));

    var result = await query
        .Select(p => new
        {
            id             = p.Id,
            partNumber     = p.PartNumber ?? "",
            partName       = p.PartName ?? "",
            description    = p.Description ?? "",
            remarks        = p.Remarks ?? "",
            price          = p.Price ?? 0,
            bdp            = p.Bdp ?? 0,
            mrp            = p.Mrp ?? 0,
            taxPercent     = p.TaxPercent ?? 0,
            stockQuantity  = p.StockQuantity ?? "",
            assemblyId     = p.AssemblyId,
            modelId        = p.ModelId,
            variantId      = p.VariantId,
            torqueNm       = p.TorqueNm ?? 0,
            imageNumber    = p.ImageNumber ?? "",
            colourIds      = string.Join(",", p.PartColours.Select(pc => pc.ColourId))
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
        worksheet.Cells[1, 12].Value = "ColourIds";
        worksheet.Cells[1, 13].Value = "TorqueNm";
        worksheet.Cells[1, 14].Value = "Remarks";
        worksheet.Cells[1, 15].Value = "ImageNumber";

        using (var range = worksheet.Cells[1, 1, 1, 15])
        {
            range.Style.Font.Bold = true;
        }

        worksheet.Cells[2, 15, 1000, 15].Style.Numberformat.Format = "@";

        worksheet.Cells[1, 15].AddComment(
            "Enter image numbers as text: 1, 1.1, 2A, etc. Column is pre-formatted as Text.",
            "BGauss"
        );

        worksheet.Column(15).Width = 25;
        worksheet.Cells.AutoFitColumns();

        var fileBytes = package.GetAsByteArray();
        var fileName = "Parts_Import_Template.xlsx";

        return File(
            fileBytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName
        );
    }

    // ================= IMPORT =================
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

            // Load valid foreign key IDs
            var validAssemblies = new HashSet<int>(await _context.Assemblies.Select(x => x.Id).ToListAsync());
            var validModels     = new HashSet<int>(await _context.VehicleModels.Select(x => x.Id).ToListAsync());
            var validVariants   = new HashSet<int>(await _context.VehicleVariants.Select(x => x.Id).ToListAsync());
            var validColours    = new HashSet<int>(await _context.VehicleColours.Select(x => x.Id).ToListAsync());

            int insertedCount  = 0;
            int updatedCount   = 0;
            int skippedCount   = 0;

            // Tracks rows skipped because PartNumber was blank
            var blankRowNumbers = new List<int>();

            // Tracks rows skipped because the exact 6-field combo already
            // existed either in the DB or appeared earlier in this same file
            var duplicateRowNumbers = new List<int>();

            // ── Inserted rows summary (row → partNumber) ──
            var insertedRows = new List<string>();

            // ── Updated rows summary (row → partNumber) ──
            var updatedRows = new List<string>();

            // ══════════════════════════════════════════════════════════════
            // KEY USED FOR TRACKING WITHIN THIS IMPORT RUN
            //
            // We build a HashSet of "composite key strings" from the DB
            // records that already exist, PLUS rows we INSERT during this
            // run, so that if the same 6-field combo appears twice in the
            // same Excel we correctly skip the second occurrence instead of
            // inserting a duplicate.
            // ══════════════════════════════════════════════════════════════
            // Seed the set from existing DB records
            var seenCompositeKeys = new HashSet<string>(
                existingParts.Select(p => BuildCompositeKey(
                    p.PartNumber,
                    p.AssemblyId,
                    p.ModelId,
                    p.VariantId,
                    p.ColourId,
                    p.ImageNumber
                ))
            );

            for (int row = 2; row <= rowCount; row++)
            {
                // ── 1. Blank PartNumber → skip silently ──────────────────
                var partNumber = worksheet.Cells[row, 1].Text?.Trim();
                if (string.IsNullOrWhiteSpace(partNumber))
                {
                    blankRowNumbers.Add(row);
                    continue;
                }

                // ── 2. Parse constant / FK columns ───────────────────────
                int excelAssemblyId = ParseIntSafe(worksheet.Cells[row, 9].Text);
                int excelModelId    = ParseIntSafe(worksheet.Cells[row, 10].Text);
                int excelVariantId  = ParseIntSafe(worksheet.Cells[row, 11].Text);
                var colourText      = worksheet.Cells[row, 12].Text?.Trim() ?? "";

                int? resolvedAssemblyId = validAssemblies.Contains(excelAssemblyId) ? excelAssemblyId : (int?)null;
                int? resolvedModelId    = validModels.Contains(excelModelId)         ? excelModelId    : (int?)null;
                int? resolvedVariantId  = validVariants.Contains(excelVariantId)     ? excelVariantId  : (int?)null;

                var validColourIds = colourText
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => ParseIntSafe(x))
                    .Where(x => x > 0 && validColours.Contains(x))
                    .ToList();

                int? resolvedColourId = validColourIds.Count > 0 ? validColourIds[0] : (int?)null;

                string? excelImageNumber = ParseImageNumberSafe(worksheet.Cells[row, 15]);

                // ── 3. Parse updatable columns ────────────────────────────
                var stockRaw = worksheet.Cells[row, 8].Value?.ToString()?.Trim()
                            ?? worksheet.Cells[row, 8].Text?.Trim()
                            ?? "";
                var stockQty = ParseIntSafe(stockRaw).ToString();

                // ── 4. Build composite key for this Excel row ─────────────
                var compositeKey = BuildCompositeKey(
                    partNumber,
                    resolvedAssemblyId,
                    resolvedModelId,
                    resolvedVariantId,
                    resolvedColourId,
                    excelImageNumber
                );

                // ══════════════════════════════════════════════════════════
                // DECISION LOGIC
                //
                // EXACT MATCH (all 6 fields identical to a DB record OR
                //              already seen earlier in this same Excel run)
                //   → This is a true duplicate row.
                //   → UPDATE non-constant fields (PartName, Description,
                //     Price, Bdp, Mrp, TaxPercent, StockQuantity,
                //     TorqueNm, Remarks).
                //   → Do NOT re-insert. Do NOT change constant fields.
                //
                // NO MATCH
                //   → PartNumber may or may not already exist in the DB,
                //     but the 6-field combination is brand-new.
                //   → INSERT a new record.
                //
                // Why this is correct:
                //   • Same PartNumber used in a different Assembly/Model/
                //     Variant/Colour/ImageNumber context is a DIFFERENT
                //     catalogue entry → INSERT.
                //   • Same PartNumber + same 6-field combo re-imported
                //     (e.g. price or stock changed in the spreadsheet)
                //     → UPDATE only.
                //   • Same row appearing twice in one Excel file
                //     → first occurrence is INSERT or UPDATE as above;
                //       second occurrence is flagged as duplicate (skipped).
                // ══════════════════════════════════════════════════════════

                if (seenCompositeKeys.Contains(compositeKey))
                {
                    // ── DUPLICATE ROW in this run ─────────────────────────
                    // This composite key was already handled (either it
                    // existed in DB before the import, OR a prior row in
                    // this same Excel already inserted/updated it).
                    //
                    // Find the matching DB record (may be null if this is
                    // the SECOND occurrence of a newly-inserted row in the
                    // same Excel, but in practice EF tracking will have it).
                    var dupPart = existingParts.FirstOrDefault(p =>
                        BuildCompositeKey(
                            p.PartNumber, p.AssemblyId, p.ModelId,
                            p.VariantId,  p.ColourId,   p.ImageNumber
                        ) == compositeKey
                    );

                    if (dupPart != null)
                    {
                        // ── UPDATE non-constant fields ────────────────────
                        dupPart.PartName      = worksheet.Cells[row, 2].Text?.Trim();
                        dupPart.Description   = worksheet.Cells[row, 3].Text?.Trim();
                        dupPart.Price         = ParseDecimalSafe(worksheet.Cells[row, 4].Text);
                        dupPart.Bdp           = ParseDecimalSafe(worksheet.Cells[row, 5].Text);
                        dupPart.Mrp           = ParseDecimalSafe(worksheet.Cells[row, 6].Text);
                        dupPart.TaxPercent    = ParseDecimalSafe(worksheet.Cells[row, 7].Text);
                        dupPart.StockQuantity = stockQty;
                        dupPart.TorqueNm      = ParseDecimalSafe(worksheet.Cells[row, 13].Text);
                        dupPart.Remarks       = worksheet.Cells[row, 14].Text?.Trim() ?? "";

                        updatedCount++;
                        updatedRows.Add($"Row {row} ({partNumber})");
                    }
                    else
                    {
                        // The composite key was seen only because a prior
                        // row in THIS Excel already inserted it (EF not yet
                        // saved). Skip to avoid a true duplicate insert.
                        duplicateRowNumbers.Add(row);
                        skippedCount++;
                    }

                    continue;
                }

                // ── Brand-new composite key → INSERT ──────────────────────
                var newPart = new Part
                {
                    PartNumber    = partNumber,
                    PartName      = worksheet.Cells[row, 2].Text?.Trim(),
                    Description   = worksheet.Cells[row, 3].Text?.Trim(),
                    Price         = ParseDecimalSafe(worksheet.Cells[row, 4].Text),
                    Bdp           = ParseDecimalSafe(worksheet.Cells[row, 5].Text),
                    Mrp           = ParseDecimalSafe(worksheet.Cells[row, 6].Text),
                    TaxPercent    = ParseDecimalSafe(worksheet.Cells[row, 7].Text),
                    StockQuantity = stockQty,
                    AssemblyId    = resolvedAssemblyId,
                    ModelId       = resolvedModelId,
                    VariantId     = resolvedVariantId,
                    ColourId      = resolvedColourId,
                    TorqueNm      = ParseDecimalSafe(worksheet.Cells[row, 13].Text),
                    Remarks       = worksheet.Cells[row, 14].Text?.Trim() ?? "",
                    ImageNumber   = excelImageNumber,
                };

                foreach (var colourId in validColourIds)
                    newPart.PartColours.Add(new PartColour { ColourId = colourId });

                _context.Parts.Add(newPart);

                // ── Register in both tracking structures so subsequent
                //    rows in this same Excel are handled correctly ──────────
                existingParts.Add(newPart);
                seenCompositeKeys.Add(compositeKey);

                insertedCount++;
                insertedRows.Add($"Row {row} ({partNumber})");
            }

            await _context.SaveChangesAsync();

            // ── Build response message ─────────────────────────────────────
            var lines = new List<string>();
            lines.Add($"Import completed: {insertedCount} inserted, {updatedCount} updated, {skippedCount} skipped.");

            // if (insertedRows.Any())
            //     lines.Add($"Inserted: {string.Join(", ", insertedRows)}.");

            if (updatedRows.Any())
                lines.Add($"Updated: {string.Join(", ", updatedRows)}.");

            if (duplicateRowNumbers.Any())
                lines.Add(
                    $"Duplicate rows skipped (exact same PartNumber + AssemblyId + ModelId + VariantId + ColourId + ImageNumber already exists): " +
                    $"{string.Join(", ", duplicateRowNumbers.Select(r => $"Row {r}"))}."
                );

            if (blankRowNumbers.Any())
                lines.Add($"Blank PartNumber rows skipped: {string.Join(", ", blankRowNumbers.Select(r => $"Row {r}"))}.");

            return Ok(string.Join(" | ", lines));
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message;
            return BadRequest($"Import failed: {ex.Message} | SQL Error: {inner}");
        }
    }

    // ── Build a normalised composite key string ───────────────────────────
    // Used both to seed seenCompositeKeys from DB records and to compute
    // the key for each incoming Excel row so the same logic applies in both
    // directions.
    private static string BuildCompositeKey(
        string? partNumber,
        int?    assemblyId,
        int?    modelId,
        int?    variantId,
        int?    colourId,
        string? imageNumber)
    {
        var pn  = (partNumber  ?? "").Trim();
        var img = NormaliseImageNumber(imageNumber);
        var asm = assemblyId?.ToString() ?? "null";
        var mdl = modelId?.ToString()    ?? "null";
        var vrt = variantId?.ToString()  ?? "null";
        var clr = colourId?.ToString()   ?? "null";

        // Pipe-delimited so individual field values cannot bleed into each other
        return $"{pn}|{asm}|{mdl}|{vrt}|{clr}|{img}";
    }

    // ── Normalise ImageNumber for comparison ─────────────────────────────
    private static string NormaliseImageNumber(string? value)
        => string.IsNullOrWhiteSpace(value) ? "" : value.Trim();

    // ================= SAFE PARSING METHODS =================
    private decimal ParseDecimalSafe(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return 0;
        value = value.Replace(",", "").Trim();
        return decimal.TryParse(value, out var result) ? result : 0;
    }

    private string? ParseImageNumberSafe(ExcelRange cell)
    {
        var rawValue = cell.Value;
        string result = "";

        if (rawValue != null)
        {
            if (rawValue is double d)
            {
                result = d == Math.Floor(d)
                    ? ((long)d).ToString()
                    : d.ToString("G");
            }
            else
            {
                result = rawValue.ToString()?.Trim() ?? "";
            }
        }

        if (string.IsNullOrWhiteSpace(result))
            result = cell.Text?.Trim() ?? "";

        result = result.TrimStart('\'').Trim();

        return string.IsNullOrWhiteSpace(result) ? null : result;
    }

    private int ParseIntSafe(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return 0;
        return int.TryParse(value, out var result) ? result : 0;
    }
}