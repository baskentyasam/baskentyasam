using System.Security.Claims;
using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "SuperAdmin")]
public class AdminUsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;

    public AdminUsersController(IUserManagementService userManagementService)
    {
        _userManagementService = userManagementService;
    }

    [HttpGet]
    public async Task<ActionResult<List<AdminUserListItemDto>>> GetUsers(
        [FromQuery] string? role,
        [FromQuery] string? search,
        [FromQuery] bool? isActive)
    {
        try
        {
            var result = await _userManagementService.GetUsersAsync(new AdminUserListQuery
            {
                Role = role,
                Search = search,
                IsActive = isActive,
            });
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminUserDetailDto>> GetUser(int id)
    {
        var user = await _userManagementService.GetUserByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { message = "Kullanıcı bulunamadı." });
        }

        return Ok(user);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AdminUserDetailDto>> UpdateUser(int id, [FromBody] UpdateAdminUserDto dto)
    {
        try
        {
            var updated = await _userManagementService.UpdateUserAsync(id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/activate")]
    public async Task<ActionResult<AdminUserDetailDto>> ActivateUser(int id)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _userManagementService.ActivateUserAsync(id, currentUserId.Value);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/deactivate")]
    public async Task<ActionResult<AdminUserDetailDto>> DeactivateUser(int id)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _userManagementService.DeactivateUserAsync(id, currentUserId.Value);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/role")]
    public async Task<ActionResult<AdminUserDetailDto>> UpdateUserRole(int id, [FromBody] UpdateAdminUserRoleDto dto)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _userManagementService.UpdateUserRoleAsync(id, dto, currentUserId.Value);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/password")]
    public async Task<IActionResult> ResetUserPassword(int id, [FromBody] ResetAdminUserPasswordDto dto)
    {
        try
        {
            await _userManagementService.ResetUserPasswordAsync(id, dto);
            return Ok(new { message = "Şifre güncellendi." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }
}
