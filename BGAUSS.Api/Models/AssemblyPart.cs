using System.ComponentModel.DataAnnotations;

namespace BGAUSS.Api.Models
{
    public class AssemblyPart
    {
        public int Id { get; set; }

        public int AssemblyId { get; set; }
        public Assembly Assembly { get; set; }

        public int PartId { get; set; }
        public Part Part { get; set; }

        public int Quantity { get; set; }

        [MaxLength(50)]
        public string FRT { get; set; }

        [MaxLength(500)]
        public string Remark { get; set; }

        [MaxLength(100)]
        public string ERP { get; set; }
    }
}