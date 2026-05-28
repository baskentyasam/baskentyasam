using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/library-areas")]
public class LibraryAreasController : ControllerBase
{
    private readonly IDirectoryService _directoryService;

    public LibraryAreasController(IDirectoryService directoryService)
    {
        _directoryService = directoryService;
    }

    [HttpGet("active")]
    public async Task<ActionResult<List<LibraryAreaListItemDto>>> GetActiveLibraryAreas()
    {
        var areas = await _directoryService.GetActiveLibraryAreasAsync();
        return Ok(areas);
    }
}
