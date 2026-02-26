using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehicleModelsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public VehicleModelsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var models = await _context.VehicleModels.ToListAsync();
        return Ok(models);
    }

    [HttpPost]
    public async Task<IActionResult> Create(VehicleModel model)
    {
        await _context.VehicleModels.AddAsync(model);
        await _context.SaveChangesAsync();
        return Ok(model);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, VehicleModel updated)
    {
        var model = await _context.VehicleModels.FindAsync(id);
        if (model == null) return NotFound();

        model.ModelName = updated.ModelName;
        await _context.SaveChangesAsync();
        return Ok(model);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var model = await _context.VehicleModels.FindAsync(id);
        if (model == null) return NotFound();

        _context.VehicleModels.Remove(model);
        await _context.SaveChangesAsync();
        return Ok("Deleted successfully");
    }
}