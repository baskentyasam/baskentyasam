using System.ComponentModel.DataAnnotations;
using ApiProject.Helpers;

namespace ApiProject.Models.DTOs;

public class ForgotPasswordRequestDto
{
    [Required(ErrorMessage = "E-posta gereklidir.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta girin.")]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequestDto
{
    [Required(ErrorMessage = "Sıfırlama anahtarı eksik.")]
    public string Token { get; set; } = string.Empty;

    [Required(ErrorMessage = "Yeni şifre gereklidir.")]
    [MinLength(PasswordPolicy.MinLength, ErrorMessage = PasswordPolicy.ErrorMessage)]
    [MaxLength(PasswordPolicy.MaxLength, ErrorMessage = PasswordPolicy.ErrorMessage)]
    [PasswordPolicy]
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    [Required(ErrorMessage = "Mevcut şifre gereklidir.")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Yeni şifre gereklidir.")]
    [MinLength(PasswordPolicy.MinLength, ErrorMessage = PasswordPolicy.ErrorMessage)]
    [MaxLength(PasswordPolicy.MaxLength, ErrorMessage = PasswordPolicy.ErrorMessage)]
    [PasswordPolicy]
    public string NewPassword { get; set; } = string.Empty;
}
