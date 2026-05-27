using System.Security.Claims;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/admin/me")]
[Authorize(Roles = "SuperAdmin,SubAdmin")]
public class MyAdminController : ControllerBase
{
    private readonly IAdminAuthorizationService _adminAuthorizationService;

    public MyAdminController(IAdminAuthorizationService adminAuthorizationService)
    {
        _adminAuthorizationService = adminAuthorizationService;
    }

    [HttpGet("assignment")]
    public async Task<ActionResult<MyAdminAssignmentDto>> GetMyAssignment()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var isSuperAdmin = await _adminAuthorizationService.IsSuperAdminAsync(userId.Value);
        if (isSuperAdmin)
        {
            return Ok(new MyAdminAssignmentDto
            {
                IsSuperAdmin = true,
                Role = UserRole.SuperAdmin.ToString(),
                Assignment = null
            });
        }

        var assignment = await _adminAuthorizationService.GetActiveAssignmentAsync(userId.Value);
        return Ok(new MyAdminAssignmentDto
        {
            IsSuperAdmin = false,
            Role = UserRole.SubAdmin.ToString(),
            Assignment = assignment == null
                ? null
                : new AdminAssignmentDto
                {
                    Id = assignment.Id,
                    ModuleType = assignment.ModuleType.ToString(),
                    ScopeKey = assignment.ScopeKey,
                    ScopeDisplayName = assignment.ScopeDisplayName,
                    IsActive = assignment.IsActive,
                    CreatedAt = assignment.CreatedAt
                }
        });
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
