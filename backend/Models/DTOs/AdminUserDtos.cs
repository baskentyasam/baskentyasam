namespace ApiProject.Models.DTOs;

public class AdminUserListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string RoleDisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? StudentNo { get; set; }
    public bool IsLegacyAdmin { get; set; }
}

public class AdminUserDetailDto : AdminUserListItemDto
{
    public string? SubAdminModuleType { get; set; }
    public string? SubAdminScopeKey { get; set; }
    public string? SubAdminScopeDisplayName { get; set; }
}

public class UpdateAdminUserDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? StudentNo { get; set; }
}

public class UpdateAdminUserRoleDto
{
    public string Role { get; set; } = string.Empty;
    public string? ModuleType { get; set; }
    public string? ScopeKey { get; set; }
    public string? ScopeDisplayName { get; set; }
}

public class ResetAdminUserPasswordDto
{
    public string NewPassword { get; set; } = string.Empty;
}

public class AdminUserListQuery
{
    public string? Role { get; set; }
    public string? Search { get; set; }
    public bool? IsActive { get; set; }
}
