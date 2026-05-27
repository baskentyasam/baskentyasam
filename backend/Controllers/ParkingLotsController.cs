using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/parking-lots")]
public class ParkingLotsController : ControllerBase
{
    private readonly IDirectoryService _directoryService;

    public ParkingLotsController(IDirectoryService directoryService)
    {
        _directoryService = directoryService;
    }

    [HttpGet("active")]
    public async Task<ActionResult<List<ParkingLotListItemDto>>> GetActiveParkingLots()
    {
        var parkingLots = await _directoryService.GetActiveParkingLotsAsync();
        return Ok(parkingLots);
    }
}
