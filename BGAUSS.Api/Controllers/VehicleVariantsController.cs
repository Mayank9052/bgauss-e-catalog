using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;

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

    [HttpGet("by-model/{modelId}")]
    public async Task<IActionResult> GetByModel(int modelId)
    {
        var variants = await _context.VehicleVariants
            .Where(v => v.ModelId == modelId)
            .ToListAsync();

        return Ok(variants);
    }

    [HttpPost]
    public async Task<IActionResult> Create(VehicleVariant variant)
    {
        await _context.VehicleVariants.AddAsync(variant);
        await _context.SaveChangesAsync();
        return Ok(variant);
    }
}