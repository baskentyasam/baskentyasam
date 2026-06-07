using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using ApiProject.Helpers;
using ApiProject.Models;

namespace ApiProject.Models.DTOs;

public class RegisterDto
{
    [Required(ErrorMessage = "Ad gereklidir")]
    [MaxLength(100)]
    [JsonPropertyName("firstName")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Soyad gereklidir")]
    [MaxLength(100)]
    [JsonPropertyName("lastName")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "E-posta gereklidir")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi girin")]
    [MaxLength(255)]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    /// <summary>Geri uyumluluk; birleşik ad soyad firstName + lastName ile oluşturulur.</summary>
    [MaxLength(200)]
    [JsonPropertyName("name")]
    public string? Username { get; set; }

    [Required(ErrorMessage = "Şifre gereklidir")]
    [MinLength(PasswordPolicy.MinLength, ErrorMessage = PasswordPolicy.ErrorMessage)]
    [MaxLength(PasswordPolicy.MaxLength, ErrorMessage = PasswordPolicy.ErrorMessage)]
    [PasswordPolicy]
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Rol gereklidir")]
    [JsonPropertyName("role")]
    public string RoleString { get; set; } = "Student";

    [MaxLength(50)]
    [JsonPropertyName("studentNo")]
    public string? StudentNo { get; set; }

    // Role property'si - string'den enum'a dönüştürülüyor
    [JsonIgnore]
    public UserRole Role
    {
        get
        {
            if (string.IsNullOrEmpty(RoleString))
                return UserRole.Student;

            return RoleString.ToLower() switch
            {
                "teacher" or "instructor" => UserRole.Teacher,
                "student" => UserRole.Student,
                "staff" => UserRole.Staff,
                "superadmin" => UserRole.SuperAdmin,
                "subadmin" => UserRole.SubAdmin,
                "admin" => UserRole.Admin,
                _ => UserRole.Student
            };
        }
    }
}

