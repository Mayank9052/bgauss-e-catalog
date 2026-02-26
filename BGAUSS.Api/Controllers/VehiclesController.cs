using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehiclesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public VehiclesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("search-by-vin/{vin}")]
    public async Task<IActionResult> SearchByVin(string vin)
    {
        var vehicle = await _context.Vehicles
            .Include(v => v.Model)
            .Include(v => v.Variant)
            .Include(v => v.Colour)
            .FirstOrDefaultAsync(v => v.VIN == vin);

        if (vehicle == null)
            return NotFound("Vehicle not found");

        var parts = await _context.ModelParts
            .Include(mp => mp.Part)
            .Where(mp =>
                mp.ModelId == vehicle.ModelId &&
                mp.VariantId == vehicle.VariantId &&
                (mp.ColourId == null || mp.ColourId == vehicle.ColourId))
            .Select(mp => mp.Part)
            .ToListAsync();

        return Ok(new
        {
            vehicle,
            parts
        });
    }
}