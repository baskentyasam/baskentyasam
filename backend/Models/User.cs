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

    // Yeni profil alanları
    // Profil fotoğrafı - base64 data URL veya path olarak saklanır
    public string? ProfileImage { get; set; }

    [MaxLength(200)]
    public string? Department { get; set; }

    [MaxLength(50)]
    public string? RoomNumber { get; set; }

    [MaxLength(50)]
    public string? PhoneNumber { get; set; }

    [MaxLength(20)]
    public string? ClassLevel { get; set; }

    /// <summary>
    /// Öğretim elemanının verdiği dersler. Virgülle ayrılmış metin olarak saklanır.
    /// (Örn: "Veri Yapıları, Algoritma, Java")
    /// </summary>
    public string? Courses { get; set; }

    public DateTime? FirstLoginAt { get; set; }

    public DateTime? LastLoginAt { get; set; }
    
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
    Admin = 3
}
