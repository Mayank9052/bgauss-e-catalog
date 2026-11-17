using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Services
{
    public interface ISearchService
    {
        // Accepts any IQueryable (a DbSet or a pre-filtered query, e.g. active records only)
        Task<List<T>> SearchAsync<T>(IQueryable<T> source, string searchTerm, params string[] properties) where T : class;
    }
}