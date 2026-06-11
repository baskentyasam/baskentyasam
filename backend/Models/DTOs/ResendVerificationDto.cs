using System.ComponentModel.DataAnnotations;

namespace ApiProject.Models.DTOs;

public class ResendVerificationDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
