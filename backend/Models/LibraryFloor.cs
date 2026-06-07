using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

[Table("library_floors")]
public class LibraryFloor
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public int MaxCapacity { get; set; }

    [Required]
    public bool IsOpen { get; set; }

    [Required]
    public int SortOrder { get; set; }
}
