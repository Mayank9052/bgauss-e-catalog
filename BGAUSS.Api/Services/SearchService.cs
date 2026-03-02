using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace BGAUSS.Api.Services
{
    public class SearchService : ISearchService
    {
        public async Task<List<T>> SearchAsync<T>(DbSet<T> dbSet, string searchTerm, params string[] properties) where T : class
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                return await dbSet.ToListAsync();

            IQueryable<T> query = dbSet;

            // Split search term by spaces for multi-word search
            var words = searchTerm.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            foreach (var word in words)
            {
                var tempWord = word.Trim();

                IQueryable<T> tempQuery = null;

                foreach (var propName in properties)
                {
                    var property = typeof(T).GetProperty(propName, BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);
                    if (property == null)
                        continue;

                    IQueryable<T> columnQuery;

                    if (property.PropertyType == typeof(string))
                    {
                        // String column → use LIKE
                        columnQuery = query.Where(e =>
                            EF.Functions.Like(EF.Property<string>(e, property.Name) ?? "", $"%{tempWord}%"));
                    }
                    else
                    {
                        // Numeric or other column → convert to string
                        columnQuery = query.Where(e =>
                            EF.Property<object>(e, property.Name).ToString().Contains(tempWord));
                    }

                    tempQuery = tempQuery == null ? columnQuery : tempQuery.Union(columnQuery);
                }

                if (tempQuery != null)
                    query = tempQuery;
            }

            return await query.ToListAsync();
        }
    }
}