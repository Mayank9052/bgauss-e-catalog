using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Services
{
    public interface ISearchService
    {
        Task<List<T>> SearchAsync<T>(DbSet<T> dbSet, string searchTerm, params string[] properties) where T : class;
    }
}