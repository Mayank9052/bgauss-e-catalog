using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;

namespace BGAUSS.Api.Controllers;

/// <summary>
/// Read-only data feed for the downloadable PDF catalogue.
/// Returns ACTIVE records only, grouped Model → Variant → Assembly → Parts,
/// honouring the same compatibility rules as the Search Parts page.
/// Prices are intentionally not included (dealer pricing is confidential).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CatalogueController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CatalogueController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET /api/catalogue/data                          → complete catalogue
    // GET /api/catalogue/data?modelId=1&variantId=2&colourId=3
    // GET /api/catalogue/data?modelId=1&variantId=2&assemblyId=79
    [HttpGet("data")]
    public async Task<IActionResult> GetData(int? modelId, int? variantId, int? colourId, int? assemblyId)
    {
        var models = await _context.VehicleModels
            .Where(m => m.IsActive && (!modelId.HasValue || m.Id == modelId.Value))
            .OrderBy(m => m.ModelName)
            .Select(m => new { m.Id, m.ModelName })
            .ToListAsync();

        var modelIds = models.Select(m => m.Id).ToList();

        var variants = await _context.VehicleVariants
            .Where(v => v.IsActive && v.ModelId != null && modelIds.Contains(v.ModelId.Value)
                        && (!variantId.HasValue || v.Id == variantId.Value))
            .OrderBy(v => v.VariantName)
            .Select(v => new { v.Id, v.VariantName, ModelId = v.ModelId!.Value })
            .ToListAsync();

        var colours = await _context.VehicleColours
            .Where(c => c.IsActive && (c.ModelId == null || modelIds.Contains(c.ModelId.Value)))
            .Select(c => new { c.Id, c.ColourName, c.ModelId, c.VariantId })
            .ToListAsync();

        var assemblies = await _context.Assemblies
            .Where(a => a.IsActive && a.ModelId != null && modelIds.Contains(a.ModelId.Value)
                        && (a.VariantId == null || a.Variant!.IsActive)
                        && (!assemblyId.HasValue || a.Id == assemblyId.Value))
            .OrderBy(a => a.AssemblyName)
            .Select(a => new { a.Id, a.AssemblyName, a.ImagePath, ModelId = a.ModelId!.Value, a.VariantId })
            .ToListAsync();

        var assemblyIds = assemblies.Select(a => a.Id).ToList();

        var partsQuery = _context.Parts
            .Where(p => p.IsActive && p.AssemblyId != null && assemblyIds.Contains(p.AssemblyId.Value));

        if (colourId.HasValue)
            partsQuery = partsQuery.Where(p =>
                (p.ColourId == null && !p.PartColours.Any()) ||
                p.ColourId == colourId.Value ||
                p.PartColours.Any(pc => pc.ColourId == colourId.Value));

        var parts = await partsQuery
            .Select(p => new
            {
                p.Id,
                AssemblyId    = p.AssemblyId!.Value,
                p.ModelId,
                p.VariantId,
                PartNumber    = p.PartNumber ?? "",
                PartName      = p.PartName ?? "",
                Description   = p.Description ?? "",
                ImageNumber   = p.ImageNumber ?? "",
                TorqueNm      = p.TorqueNm,
                PartImagePath = p.PartImages.OrderBy(i => i.Id).Select(i => i.ImagePath).FirstOrDefault() ?? "",
                ColourNames   = string.Join(", ", p.PartColours.Select(pc => pc.Colour.ColourName)),
            })
            .ToListAsync();

        var selectedColour = colourId.HasValue ? colours.FirstOrDefault(c => c.Id == colourId.Value)?.ColourName : null;

        var groups = new List<object>();

        foreach (var model in models)
        {
            var modelVariants = variants.Where(v => v.ModelId == model.Id).ToList();

            // Models without variants still get a section (variant-agnostic assemblies)
            var variantSlots = modelVariants.Count > 0
                ? modelVariants.Select(v => ((int?)v.Id, (string?)v.VariantName)).ToList()
                : (variantId.HasValue ? new List<(int?, string?)>() : new List<(int?, string?)> { (null, null) });

            foreach (var (vId, vName) in variantSlots)
            {
                var groupAssemblies = assemblies
                    .Where(a => a.ModelId == model.Id && (a.VariantId == null || a.VariantId == vId))
                    .Select(a => new
                    {
                        id           = a.Id,
                        assemblyName = a.AssemblyName ?? "",
                        imagePath    = (a.ImagePath ?? "").Replace("\r", "").Replace("\n", "").Trim(),
                        parts        = parts
                            .Where(p => p.AssemblyId == a.Id && p.ModelId == model.Id
                                        && (p.VariantId == null || p.VariantId == vId))
                            .OrderBy(p => p.ImageNumber, NaturalComparer.Instance)
                            .ThenBy(p => p.PartNumber)
                            .Select(p => new
                            {
                                id            = p.Id,
                                imageNumber   = p.ImageNumber,
                                partNumber    = p.PartNumber,
                                partName      = p.PartName,
                                description   = p.Description,
                                torqueNm      = p.TorqueNm,
                                partImagePath = p.PartImagePath,
                                colourNames   = p.ColourNames,
                            })
                            .ToList(),
                    })
                    .Where(a => a.parts.Count > 0 || !string.IsNullOrEmpty(a.imagePath))
                    .ToList();

                if (groupAssemblies.Count == 0) continue;

                var groupColours = colours
                    .Where(c => (c.ModelId == null || c.ModelId == model.Id) && (c.VariantId == null || c.VariantId == vId))
                    .Select(c => c.ColourName ?? "")
                    .Where(n => n.Length > 0)
                    .Distinct()
                    .OrderBy(n => n)
                    .ToList();

                groups.Add(new
                {
                    modelId     = model.Id,
                    modelName   = model.ModelName,
                    variantId   = vId,
                    variantName = vName ?? "",
                    colourName  = selectedColour ?? "",
                    colours     = groupColours,
                    assemblies  = groupAssemblies,
                });
            }
        }

        return Ok(new
        {
            generatedAt = DateTime.Now,
            groups,
        });
    }

    /// <summary>Orders image numbers like 1, 2, 8.1, 8.2, 10 naturally.</summary>
    private sealed class NaturalComparer : IComparer<string>
    {
        public static readonly NaturalComparer Instance = new();

        public int Compare(string? a, string? b)
        {
            a ??= ""; b ??= "";
            if (a.Length == 0 && b.Length > 0) return 1;   // blanks last
            if (b.Length == 0 && a.Length > 0) return -1;

            var pa = a.Split('.', '-', ' ');
            var pb = b.Split('.', '-', ' ');
            for (int i = 0; i < Math.Min(pa.Length, pb.Length); i++)
            {
                int c = int.TryParse(pa[i], out var na) && int.TryParse(pb[i], out var nb)
                    ? na.CompareTo(nb)
                    : string.Compare(pa[i], pb[i], StringComparison.OrdinalIgnoreCase);
                if (c != 0) return c;
            }
            return pa.Length.CompareTo(pb.Length);
        }
    }
}
