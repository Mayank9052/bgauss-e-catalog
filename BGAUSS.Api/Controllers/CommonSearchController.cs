using Microsoft.AspNetCore.Mvc;
using BGAUSS.Api.Models;
using BGAUSS.Api.Services;

namespace BGAUSS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommonSearchController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ISearchService _searchService;

        public CommonSearchController(ApplicationDbContext context, ISearchService searchService)
        {
            _context = context;
            _searchService = searchService;
        }

        /// <summary>
        /// Search any entity by query (multi-word, partial match)
        /// </summary>
        /// <param name="entityName">Entity name: parts, assemblies, categories, vehiclemodels, etc.</param>
        /// <param name="query">Search term (can be multiple words)</param>
        [HttpGet("{entityName}")]
        public async Task<IActionResult> Search(string entityName, string query)
        {
            if (string.IsNullOrWhiteSpace(entityName))
                return BadRequest("EntityName is required.");

            if (string.IsNullOrWhiteSpace(query))
                return BadRequest("Search query is required.");

            switch (entityName.ToLower())
            {
                case "parts":
                    var parts = await _searchService.SearchAsync(_context.Parts, query, "PartName", "PartNumber", "Description");
                    return Ok(parts);

                case "assemblies":
                    var assemblies = await _searchService.SearchAsync(_context.Assemblies, query, "AssemblyName", "ImageNo");
                    return Ok(assemblies);

                case "categories":
                    var categories = await _searchService.SearchAsync(_context.Categories, query, "CategoryName");
                    return Ok(categories);

                case "vehiclemodels":
                    var models = await _searchService.SearchAsync(_context.VehicleModels, query, "ModelName");
                    return Ok(models);

                case "vehiclevariants":
                    var variants = await _searchService.SearchAsync(_context.VehicleVariants, query, "VariantName");
                    return Ok(variants);

                case "vehiclecolours":
                    var colours = await _searchService.SearchAsync(_context.VehicleColours, query, "ColourName");
                    return Ok(colours);

                case "users":
                    var users = await _searchService.SearchAsync(_context.Users, query, "Username", "Role");
                    return Ok(users);

                default:
                    return NotFound("Entity not found");
            }
        }
    }
}