using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using BGAUSS.Api.DTOs;

namespace BGAUSS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AssembliesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AssembliesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ✅ GET ALL
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var assemblies = await _context.Assemblies
                .Select(a => new AssemblyDto
                {
                    Id = a.Id,
                    AssemblyName = a.AssemblyName,
                    ImageNo = a.ImageNo
                })
                .ToListAsync();

            return Ok(assemblies);
        }

        // ✅ GET BY ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var assembly = await _context.Assemblies
                .Where(a => a.Id == id)
                .Select(a => new AssemblyDto
                {
                    Id = a.Id,
                    AssemblyName = a.AssemblyName,
                    ImageNo = a.ImageNo
                })
                .FirstOrDefaultAsync();

            if (assembly == null)
                return NotFound();

            return Ok(assembly);
        }

        // ✅ CREATE
        [HttpPost]
        public async Task<IActionResult> Create(AssemblyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.AssemblyName))
                return BadRequest("Assembly Name is required.");

            var assembly = new Assembly
            {
                AssemblyName = dto.AssemblyName,
                ImageNo = dto.ImageNo
            };

            _context.Assemblies.Add(assembly);
            await _context.SaveChangesAsync();

            dto.Id = assembly.Id;

            return CreatedAtAction(nameof(GetById), new { id = assembly.Id }, dto);
        }

        // ✅ UPDATE
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, AssemblyDto dto)
        {
            var assembly = await _context.Assemblies.FindAsync(id);

            if (assembly == null)
                return NotFound();

            assembly.AssemblyName = dto.AssemblyName;
            assembly.ImageNo = dto.ImageNo;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ✅ DELETE
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var assembly = await _context.Assemblies.FindAsync(id);

            if (assembly == null)
                return NotFound();

            _context.Assemblies.Remove(assembly);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}