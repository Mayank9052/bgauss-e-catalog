using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;

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

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var colours = await _context.VehicleColours.ToListAsync();
        return Ok(colours);
    }

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

    [HttpPost]
    public async Task<IActionResult> Create(VehicleColour colour)
    {
        await _context.VehicleColours.AddAsync(colour);
        await _context.SaveChangesAsync();
        return Ok(colour);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, VehicleColour updated)
    {
        var colour = await _context.VehicleColours.FindAsync(id);
        if (colour == null) return NotFound();

        colour.ColourName = updated.ColourName;
        await _context.SaveChangesAsync();
        return Ok(colour);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var colour = await _context.VehicleColours.FindAsync(id);
        if (colour == null) return NotFound();

        _context.VehicleColours.Remove(colour);
        await _context.SaveChangesAsync();
        return Ok("Deleted successfully");
    }
}
