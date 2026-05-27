using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/faculties")]
public class FacultiesController : ControllerBase
{
    private readonly IDirectoryService _directoryService;

    public FacultiesController(IDirectoryService directoryService)
    {
        _directoryService = directoryService;
    }

    [HttpGet("active")]
    public async Task<ActionResult<List<FacultyListItemDto>>> GetActiveFaculties()
    {
        var faculties = await _directoryService.GetActiveFacultiesAsync();
        return Ok(faculties);
    }
}
