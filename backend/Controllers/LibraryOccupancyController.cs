using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/library")]
public class LibraryOccupancyController : ControllerBase
{
    private readonly ILibraryManagementService _libraryService;

    public LibraryOccupancyController(ILibraryManagementService libraryService)
    {
        _libraryService = libraryService;
    }

    [HttpGet("occupancy")]
    public async Task<ActionResult<LibraryOccupancySnapshotDto>> GetOccupancy()
    {
        return Ok(await _libraryService.GetPublicSnapshotAsync());
    }

    [HttpPost("occupancy/push")]
    public async Task<IActionResult> PushOccupancy([FromBody] OccupancyPushDto dto)
    {
        var expectedToken = Environment.GetEnvironmentVariable("DEVICE_TOKEN");
        if (string.IsNullOrWhiteSpace(expectedToken))
        {
            return StatusCode(503, new { message = "Cihaz entegrasyonu yapılandırılmamış." });
        }

        var providedToken = Request.Headers["X-Device-Token"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(providedToken) || providedToken != expectedToken)
        {
            return Unauthorized(new { message = "Geçersiz cihaz token'ı." });
        }

        var snapshot = await _libraryService.GetPublicSnapshotAsync();
        var newOccupancy = Math.Max(0, snapshot.CurrentOccupancy + dto.In - dto.Out);
        var updated = await _libraryService.UpdateOccupancyAsync(newOccupancy);

        return Ok(new
        {
            previousOccupancy = snapshot.CurrentOccupancy,
            currentOccupancy = updated.CurrentOccupancy,
            availableSlots = updated.AvailableSlots,
            occupancyRate = updated.OccupancyRate,
        });
    }
}
