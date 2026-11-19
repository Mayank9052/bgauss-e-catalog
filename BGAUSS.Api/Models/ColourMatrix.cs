using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BGAUSS.Api.Models;

/// <summary>
/// An uploaded colour matrix file (Excel .xlsx or PDF) for a model,
/// optionally narrowed to a variant and/or colour. Table: dbo.ColourMatrices
/// (created by Database/2026-11-18_ColourMatrix.sql).
/// </summary>
[Table("ColourMatrices")]
public class ColourMatrix
{
    [Key]
    public int Id { get; set; }

    public int ModelId { get; set; }

    public int? VariantId { get; set; }

    public int? ColourId { get; set; }

    [StringLength(200)]
    public string Title { get; set; } = null!;

    /// <summary>Web path under wwwroot, e.g. "/Colour Matrix/C12_MAX_R_20261118101500.xlsx".</summary>
    [StringLength(500)]
    public string FilePath { get; set; } = null!;

    [StringLength(260)]
    public string OriginalFileName { get; set; } = null!;

    /// <summary>"xlsx" or "pdf".</summary>
    [StringLength(10)]
    public string FileType { get; set; } = null!;

    public long FileSize { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime UploadedAt { get; set; }

    [StringLength(100)]
    public string? UploadedBy { get; set; }

    [ForeignKey(nameof(ModelId))]
    public virtual VehicleModel? Model { get; set; }

    [ForeignKey(nameof(VariantId))]
    public virtual VehicleVariant? Variant { get; set; }

    [ForeignKey(nameof(ColourId))]
    public virtual VehicleColour? Colour { get; set; }
}
