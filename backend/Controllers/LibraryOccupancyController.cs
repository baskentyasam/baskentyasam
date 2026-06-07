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
}
