using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ApiProject.Models;

public class User
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public UserRole Role { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? StudentNo { get; set; }
    
    [MaxLength(50)]
    public string? LoginType { get; set; }

    public bool IsActive { get; set; } = true;

    public string? ProfileImage { get; set; }

    /// <summary>Profil ekranındaki metin bölüm alanı (fakülte tablosu ile karışmaması için ayrı kolon).</summary>
    [Column("profile_department")]
    public string? ProfileDepartment { get; set; }

    [MaxLength(50)]
    public string? RoomNumber { get; set; }

    [MaxLength(50)]
    public string? PhoneNumber { get; set; }

    [MaxLength(20)]
    public string? ClassLevel { get; set; }

    public string? Courses { get; set; }

    public DateTime? FirstLoginAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public int? DepartmentId { get; set; }

    public bool IsVisibleForAppointment { get; set; } = true;

    [ForeignKey(nameof(DepartmentId))]
    public virtual Department? Department { get; set; }
    
    // Navigation Properties
    public virtual ICollection<Appointment> StudentAppointments { get; set; } = new List<Appointment>();
    public virtual ICollection<Appointment> TeacherAppointments { get; set; } = new List<Appointment>();
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}

public enum UserRole
{
    Student = 0,
    Teacher = 1,
    Staff = 2,
    Admin = 3,
    SuperAdmin = 4,
    SubAdmin = 5
}
