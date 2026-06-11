using System.Security.Claims;
using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/admin/parking")]
[Authorize(Roles = "SuperAdmin,SubAdmin")]
public class AdminParkingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAdminAuthorizationService _adminAuthorizationService;
    private readonly IOccupancyLogService _occupancyLogs;

    public AdminParkingController(
        AppDbContext context,
        IAdminAuthorizationService adminAuthorizationService,
        IOccupancyLogService occupancyLogs)
    {
        _context = context;
        _adminAuthorizationService = adminAuthorizationService;
        _occupancyLogs = occupancyLogs;
    }

    [HttpGet]
    public async Task<ActionResult<List<ParkingLot>>> GetParkingLots()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (await _adminAuthorizationService.IsSuperAdminAsync(userId.Value))
        {
            return Ok(await _context.ParkingLots.OrderBy(p => p.Name).ToListAsync());
        }

        var assignment = await _adminAuthorizationService.GetActiveAssignmentAsync(userId.Value);
        if (assignment == null || assignment.ModuleType != AdminModuleType.Parking) return Forbid();
        if (!int.TryParse(assignment.ScopeKey, out var parkingId)) return Forbid();

        var one = await _context.ParkingLots.Where(p => p.Id == parkingId).ToListAsync();
        return Ok(one);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ParkingLot>> Create([FromBody] UpsertParkingLotDto dto)
    {
        var exists = await _context.ParkingLots.AnyAsync(p => p.Name.ToLower() == dto.Name.Trim().ToLower());
        if (exists) return BadRequest(new { message = "Bu isimde bir otopark zaten var." });

        var lot = new ParkingLot
        {
            Name = dto.Name.Trim(),
            Location = dto.Location?.Trim(),
            Capacity = Math.Max(dto.Capacity, 0),
            CurrentOccupancy = Math.Max(dto.CurrentOccupancy, 0),
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };
        _context.ParkingLots.Add(lot);
        await _context.SaveChangesAsync();
        return Ok(lot);
    }

    [HttpPut("{parkingLotId:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ParkingLot>> Update(int parkingLotId, [FromBody] UpsertParkingLotDto dto)
    {
        var lot = await _context.ParkingLots.FindAsync(parkingLotId);
        if (lot == null) return NotFound();

        lot.Name = dto.Name.Trim();
        lot.Location = dto.Location?.Trim();
        lot.Capacity = Math.Max(dto.Capacity, 0);
        lot.CurrentOccupancy = Math.Clamp(dto.CurrentOccupancy, 0, lot.Capacity);
        lot.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        return Ok(lot);
    }

    [HttpGet("{parkingLotId:int}")]
    public async Task<ActionResult<ParkingLot>> GetDetail(int parkingLotId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        try
        {
            await _adminAuthorizationService.EnsureModuleScopeAccessAsync(
                userId.Value, AdminModuleType.Parking, parkingLotId.ToString());
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }

        var lot = await _context.ParkingLots.FirstOrDefaultAsync(p => p.Id == parkingLotId);
        if (lot == null) return NotFound();
        return Ok(lot);
    }

    [HttpPut("{parkingLotId:int}/metrics")]
    public async Task<ActionResult<ParkingLot>> UpdateMetrics(int parkingLotId, [FromBody] UpdateParkingMetricsDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        try
        {
            await _adminAuthorizationService.EnsureModuleScopeAccessAsync(
                userId.Value, AdminModuleType.Parking, parkingLotId.ToString());
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }

        var lot = await _context.ParkingLots.FirstOrDefaultAsync(p => p.Id == parkingLotId);
        if (lot == null) return NotFound();

        var isSuperAdmin = await _adminAuthorizationService.IsSuperAdminAsync(userId.Value);
        if (!isSuperAdmin)
        {
            // SubAdmin: sadece kapasite/doluluk
            lot.Capacity = Math.Max(dto.Capacity, 0);
            lot.CurrentOccupancy = Math.Clamp(dto.CurrentOccupancy, 0, lot.Capacity);
        }
        else
        {
            lot.Capacity = Math.Max(dto.Capacity, 0);
            lot.CurrentOccupancy = Math.Clamp(dto.CurrentOccupancy, 0, lot.Capacity);
        }

        await _context.SaveChangesAsync();
        await _occupancyLogs.AppendAsync($"parking-{lot.Id}", lot.CurrentOccupancy, lot.Capacity);
        return Ok(lot);
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
