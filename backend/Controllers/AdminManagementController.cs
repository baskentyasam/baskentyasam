using System.Security.Claims;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/admin/sub-admins")]
[Authorize(Roles = "SuperAdmin")]
public class AdminManagementController : ControllerBase
{
    private readonly ISubAdminManagementService _subAdminManagementService;
    private readonly IDirectoryService _directoryService;

    public AdminManagementController(
        ISubAdminManagementService subAdminManagementService,
        IDirectoryService directoryService)
    {
        _subAdminManagementService = subAdminManagementService;
        _directoryService = directoryService;
    }

    [HttpGet]
    public async Task<ActionResult<List<SubAdminListItemDto>>> GetSubAdmins()
    {
        var result = await _subAdminManagementService.GetSubAdminsAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<SubAdminListItemDto>> CreateSubAdmin([FromBody] CreateSubAdminDto dto)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var created = await _subAdminManagementService.CreateSubAdminAsync(dto, currentUserId.Value);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{userId:int}/deactivate")]
    public async Task<ActionResult> DeactivateSubAdmin(int userId)
    {
        var ok = await _subAdminManagementService.DeactivateSubAdminAsync(userId);
        if (!ok)
        {
            return NotFound(new { message = "SubAdmin bulunamadı." });
        }

        return Ok(new { message = "SubAdmin pasifleştirildi." });
    }

    [HttpGet("assignable-scopes")]
    public async Task<ActionResult<List<AssignableScopeDto>>> GetAssignableScopes([FromQuery] AdminModuleType moduleType)
    {
        var scopes = await _directoryService.GetAssignableScopesAsync(moduleType);
        return Ok(scopes);
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out int userId))
        {
            return userId;
        }

        return null;
    }
}
