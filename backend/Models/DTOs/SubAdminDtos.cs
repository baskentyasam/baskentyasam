using System.ComponentModel.DataAnnotations;
using ApiProject.Models;

namespace ApiProject.Models.DTOs;

public class CreateSubAdminDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public AdminModuleType ModuleType { get; set; }

    [Required]
    [MaxLength(100)]
    public string ScopeKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string ScopeDisplayName { get; set; } = string.Empty;
}

public class SubAdminListItemDto
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string Role { get; set; } = string.Empty;
    public AdminAssignmentDto? Assignment { get; set; }
}

public class AdminAssignmentDto
{
    public int Id { get; set; }
    public string ModuleType { get; set; } = string.Empty;
    public string ScopeKey { get; set; } = string.Empty;
    public string ScopeDisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
