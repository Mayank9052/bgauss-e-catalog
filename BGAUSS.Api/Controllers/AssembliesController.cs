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

        // GET ALL
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var assemblies = await _context.Assemblies
                .Select(a => new AssemblyDto
                {
                    Id = a.Id,
                    AssemblyName = a.AssemblyName,
                    ImagePath = a.ImagePath,
                    ModelId = a.ModelId
                })
                .ToListAsync();

            return Ok(assemblies);
        }

        // GET BY ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var assembly = await _context.Assemblies
                .Where(a => a.Id == id)
                .Select(a => new AssemblyDto
                {
                    Id = a.Id,
                    AssemblyName = a.AssemblyName,
                    ImagePath = a.ImagePath,
                    ModelId = a.ModelId
                })
                .FirstOrDefaultAsync();

            if (assembly == null)
                return NotFound();

            return Ok(assembly);
        }

        // GET all Assembly images by ModelId
        [HttpGet("images/{modelId}")]
        public async Task<IActionResult> GetImagesByModelId(int modelId)
        {
            // Fetch assemblies for this ModelId
            var assemblies = await _context.Assemblies
                .Where(a => a.ModelId == modelId && !string.IsNullOrEmpty(a.ImagePath))
                .ToListAsync();

            if (!assemblies.Any())
                return NotFound("No assembly images found for this ModelId");

            var imageUrls = new List<string>();
            var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            foreach (var assembly in assemblies)
            {
                // Clean DB path
                var cleanPath = assembly.ImagePath.Replace("\n", "")
                                                .Replace("\r", "")
                                                .Trim();

                // Physical file path
                var filePath = Path.Combine(wwwrootPath, cleanPath.TrimStart('/'));

                // Only add if the file exists
                if (System.IO.File.Exists(filePath))
                {
                    // Build relative URL for frontend
                    var url = $"{Request.Scheme}://{Request.Host}/{cleanPath.Replace("\\", "/").TrimStart('/')}";
                    imageUrls.Add(url);
                }
            }

            if (!imageUrls.Any())
                return NotFound("No assembly images found on server for this ModelId");

            return Ok(imageUrls);
        }

        // CREATE
        [HttpPost]
        public async Task<IActionResult> Create(AssemblyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.AssemblyName))
                return BadRequest("Assembly Name is required.");

            var assembly = new Assembly
            {
                AssemblyName = dto.AssemblyName,
                ImagePath = dto.ImagePath,
                ModelId = dto.ModelId
            };

            _context.Assemblies.Add(assembly);
            await _context.SaveChangesAsync();

            dto.Id = assembly.Id;

            return CreatedAtAction(nameof(GetById), new { id = assembly.Id }, dto);
        }

        // UPDATE
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, AssemblyDto dto)
        {
            var assembly = await _context.Assemblies.FindAsync(id);

            if (assembly == null)
                return NotFound();

            assembly.AssemblyName = dto.AssemblyName;
            assembly.ImagePath = dto.ImagePath;
            assembly.ModelId = dto.ModelId;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE
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