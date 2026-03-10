using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModelPartsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ModelPartsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("filter")]
    public async Task<IActionResult> Filter(int modelId, int variantId, int? colourId)
    {
        var parts = await _context.ModelParts
            .Include(mp => mp.Part)
            .Where(mp =>
                mp.ModelId == modelId &&
                mp.VariantId == variantId &&
                (colourId == null || mp.ColourId == colourId))
            .Select(mp => mp.Part)
            .ToListAsync();

        return Ok(parts);
    }

    [HttpGet("assemblies")]
    public async Task<IActionResult> Assemblies(int modelId, int variantId, int? colourId)
    {
        var assemblyIds = await _context.ModelParts
            .Include(mp => mp.Part)
            .Where(mp =>
                mp.ModelId == modelId &&
                mp.VariantId == variantId &&
                (colourId == null || mp.ColourId == colourId) &&
                mp.Part != null &&
                mp.Part.AssemblyId != null)
            .Select(mp => mp.Part!.AssemblyId!.Value)
            .Distinct()
            .ToListAsync();

        if (assemblyIds.Count == 0)
            return Ok(Array.Empty<object>());

        var assemblies = await _context.Assemblies
            .Where(a => assemblyIds.Contains(a.Id))
            .OrderBy(a => a.AssemblyName)
            .Select(a => new
            {
                id = a.Id,
                assemblyName = a.AssemblyName,
                imagePath = a.ImagePath
            })
            .ToListAsync();

        return Ok(assemblies);
    }
}
