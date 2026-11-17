using System.Security.Claims;

namespace BGAUSS.Api.Infrastructure;

public static class CatalogueAccess
{
    /// <summary>True when the caller's JWT carries the Admin role (case-insensitive).</summary>
    public static bool IsAdmin(this ClaimsPrincipal? user) =>
        user?.Claims.Any(c =>
            (c.Type == ClaimTypes.Role || c.Type == "role") &&
            string.Equals(c.Value, "Admin", StringComparison.OrdinalIgnoreCase)) == true;

    /// <summary>
    /// Inactive catalogue records are only returned to administrators who
    /// explicitly ask for them (Admin Modules screen). Everyone else —
    /// including admins browsing the customer catalogue — sees ACTIVE records only.
    /// </summary>
    public static bool CanSeeInactive(this ClaimsPrincipal? user, bool includeInactive) =>
        includeInactive && user.IsAdmin();
}
