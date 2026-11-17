using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BGAUSS.Api.Models;

/// <summary>
/// A clickable callout on an assembly drawing (PDF page or image).
/// Coordinates are normalised (0..1) relative to the rendered page/image so
/// they stay correct at any zoom level or screen size.
/// <see cref="Label"/> matches <see cref="Part.ImageNumber"/> of the parts in the assembly.
/// </summary>
[Table("AssemblyHotspots")]
public partial class AssemblyHotspot
{
    [Key]
    public int Id { get; set; }

    public int AssemblyId { get; set; }

    [StringLength(50)]
    public string Label { get; set; } = string.Empty;

    /// <summary>1-based PDF page number (always 1 for images).</summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>Centre X, 0..1 of page width.</summary>
    public double X { get; set; }

    /// <summary>Centre Y, 0..1 of page height.</summary>
    public double Y { get; set; }

    /// <summary>Hotspot width, 0..1 of page width.</summary>
    public double Width { get; set; }

    /// <summary>Hotspot height, 0..1 of page height.</summary>
    public double Height { get; set; }

    [ForeignKey("AssemblyId")]
    [InverseProperty("Hotspots")]
    public virtual Assembly? Assembly { get; set; }
}
