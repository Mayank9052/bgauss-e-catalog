using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using BGAUSS.Api.DTOs;

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

    // ✅ GET ALL PARTS (No Cycle Error)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var parts = await _context.Parts
            .Include(p => p.Category)
            .Select(p => new PartResponse
            {
                Id = p.Id,
                PartNumber = p.PartNumber,
                PartName = p.PartName,
                Description = p.Description,
                Price = p.Price,
                ImagePath = p.ImagePath,
                CategoryName = p.Category != null ? p.Category.CategoryName : null
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

        await _context.Parts.AddAsync(part);
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
        part.Price = updated.Price;
        part.ImagePath = updated.ImagePath;
        part.CategoryId = updated.CategoryId;

        await _context.SaveChangesAsync();

        return Ok(part);
    }

    // ✅ DELETE PART
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

    // ✅ SEARCH PARTS
    [HttpGet("search")]
    public async Task<IActionResult> Search(string? name, string? partNumber)
    {
        var query = _context.Parts.Include(p => p.Category).AsQueryable();

        if (!string.IsNullOrEmpty(name))
            query = query.Where(p => p.PartName.Contains(name));

        if (!string.IsNullOrEmpty(partNumber))
            query = query.Where(p => p.PartNumber.Contains(partNumber));

        var result = await query
            .Select(p => new PartResponse
            {
                Id = p.Id,
                PartNumber = p.PartNumber,
                PartName = p.PartName,
                Description = p.Description,
                Price = p.Price,
                ImagePath = p.ImagePath,
                CategoryName = p.Category != null ? p.Category.CategoryName : null
            })
            .ToListAsync();

        return Ok(result);
    }
}