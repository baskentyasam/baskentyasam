using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

[Table("departments")]
public class Department
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int FacultyId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public bool IsActive { get; set; } = true;

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(FacultyId))]
    public virtual Faculty Faculty { get; set; } = null!;

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
