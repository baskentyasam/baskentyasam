using System.Security.Claims;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/admin/library")]
[Authorize(Roles = "SuperAdmin,SubAdmin")]
public class AdminLibraryController : ControllerBase
{
    private readonly ILibraryManagementService _libraryService;
    private readonly IAdminAuthorizationService _adminAuthorizationService;

    public AdminLibraryController(
        ILibraryManagementService libraryService,
        IAdminAuthorizationService adminAuthorizationService)
    {
        _libraryService = libraryService;
        _adminAuthorizationService = adminAuthorizationService;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<LibraryAdminOverviewDto>> GetOverview()
    {
        var denied = await EnsureLibraryAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        return Ok(await _libraryService.GetOverviewAsync());
    }

    [HttpPut("floors/open")]
    public async Task<ActionResult<LibraryAdminOverviewDto>> UpdateOpenFloors(
        [FromBody] UpdateLibraryOpenFloorsDto dto)
    {
        var denied = await EnsureLibraryAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            return Ok(await _libraryService.UpdateOpenFloorsAsync(dto.OpenFloorCodes));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("floors/capacities")]
    public async Task<ActionResult<LibraryAdminOverviewDto>> UpdateCapacities(
        [FromBody] UpdateLibraryCapacitiesDto dto)
    {
        var denied = await EnsureLibraryAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            if (dto.Floors == null || dto.Floors.Count == 0)
            {
                return BadRequest(new { message = "En az bir kat kapasitesi gönderilmelidir." });
            }

            return Ok(await _libraryService.UpdateCapacitiesAsync(dto.Floors));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("occupancy")]
    public async Task<ActionResult<LibraryAdminOverviewDto>> UpdateOccupancy(
        [FromBody] UpdateLibraryOccupancyDto dto)
    {
        var denied = await EnsureLibraryAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            if (dto.CurrentOccupancy < 0)
            {
                return BadRequest(new { message = "Kişi sayısı 0 veya daha büyük olmalıdır." });
            }

            return Ok(await _libraryService.UpdateOccupancyAsync(dto.CurrentOccupancy));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private async Task<ActionResult?> EnsureLibraryAccessAsync()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        if (await _adminAuthorizationService.IsSuperAdminAsync(userId.Value))
        {
            return null;
        }

        try
        {
            await _adminAuthorizationService.EnsureModuleScopeAccessAsync(
                userId.Value,
                AdminModuleType.Library,
                AdminAssignableScopes.LibraryScopeKey);
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
