using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

public enum AdminModuleType
{
    Cafeteria = 0,
    Parking = 1,
    Library = 2,
    Appointment = 3
}

[Table("admin_assignments")]
public class AdminAssignment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public AdminModuleType ModuleType { get; set; }

    [Required]
    [MaxLength(100)]
    public string ScopeKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string ScopeDisplayName { get; set; } = string.Empty;

    [Required]
    public bool IsActive { get; set; } = true;

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public int CreatedByUserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    [ForeignKey(nameof(CreatedByUserId))]
    public virtual User CreatedByUser { get; set; } = null!;
}
