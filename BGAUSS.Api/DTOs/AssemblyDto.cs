namespace BGAUSS.Api.DTOs;

public class AssemblyDto
{
    public int     Id           { get; set; }
    public string? AssemblyName { get; set; }
    public string? ImagePath    { get; set; }
    public int     ModelId      { get; set; }

    // ── NEW ──
    public int?    VariantId    { get; set; }

    // ── Read-only display helpers (returned from GET, ignored on POST/PUT) ──
    public string? ModelName    { get; set; }
    public string? VariantName  { get; set; }
}
