using BGAUSS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Infrastructure;

/// <summary>
/// Applies the idempotent, additive SQL in Database/*.sql at start-up.
/// The database is managed database-first (scaffolded entities), so this
/// replaces an EF migration for the catalogue-enhancement columns/tables.
/// Disable with "Database": { "AutoApplySchemaUpdates": false } and run the
/// script manually in SSMS if the API's SQL login has no ALTER permission.
/// </summary>
public static class SchemaUpdater
{
    public static async Task ApplyAsync(WebApplication app)
    {
        var enabled = app.Configuration.GetValue("Database:AutoApplySchemaUpdates", true);
        var logger  = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("SchemaUpdater");

        if (!enabled)
        {
            logger.LogInformation("Automatic schema updates are disabled (Database:AutoApplySchemaUpdates=false).");
            return;
        }

        var scriptDir = Path.Combine(app.Environment.ContentRootPath, "Database");
        if (!Directory.Exists(scriptDir))
        {
            logger.LogWarning("Schema script folder not found: {Dir}", scriptDir);
            return;
        }

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        foreach (var file in Directory.GetFiles(scriptDir, "*.sql").OrderBy(f => f, StringComparer.OrdinalIgnoreCase))
        {
            try
            {
                var sql = await File.ReadAllTextAsync(file);
                // Each top-level statement is executed separately so one failure is reported clearly.
                foreach (var batch in SplitStatements(sql))
                    await db.Database.ExecuteSqlRawAsync(batch);

                logger.LogInformation("Schema script applied: {File}", Path.GetFileName(file));
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Schema script {File} could not be applied. Run it manually in SQL Server Management Studio.",
                    Path.GetFileName(file));
            }
        }
    }

    /// <summary>
    /// Splits the script into executable units: every "IF ..." block (single
    /// statement or BEGIN/END) becomes one batch. Comments are removed.
    /// </summary>
    internal static IEnumerable<string> SplitStatements(string sql)
    {
        // strip /* */ and -- comments
        sql = System.Text.RegularExpressions.Regex.Replace(sql, @"/\*.*?\*/", "", System.Text.RegularExpressions.RegexOptions.Singleline);
        sql = System.Text.RegularExpressions.Regex.Replace(sql, @"--[^\r\n]*", "");

        var lines   = sql.Split('\n');
        var current = new System.Text.StringBuilder();
        int depth   = 0;

        foreach (var raw in lines)
        {
            var line    = raw.TrimEnd('\r');
            var trimmed = line.Trim();
            if (trimmed.Length == 0) continue;

            bool startsNew = depth == 0 && trimmed.StartsWith("IF ", StringComparison.OrdinalIgnoreCase);
            if (startsNew && current.Length > 0)
            {
                yield return current.ToString();
                current.Clear();
            }

            current.AppendLine(line);

            if (trimmed.Equals("BEGIN", StringComparison.OrdinalIgnoreCase)) depth++;
            if (trimmed.StartsWith("END", StringComparison.OrdinalIgnoreCase) && depth > 0) depth--;
        }

        if (current.Length > 0) yield return current.ToString();
    }
}
