namespace ApiProject.Models.DTOs;

public class MyAdminAssignmentDto
{
    public bool IsSuperAdmin { get; set; }
    public string Role { get; set; } = string.Empty;
    public AdminAssignmentDto? Assignment { get; set; }
}
