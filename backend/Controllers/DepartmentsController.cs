using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/departments")]
public class DepartmentsController : ControllerBase
{
    private readonly IDirectoryService _directoryService;

    public DepartmentsController(IDirectoryService directoryService)
    {
        _directoryService = directoryService;
    }

    [HttpGet]
    public async Task<ActionResult<List<DepartmentListItemDto>>> GetDepartments([FromQuery] int? facultyId)
    {
        if (!facultyId.HasValue)
        {
            return BadRequest(new { message = "facultyId parametresi gereklidir." });
        }

        var departments = await _directoryService.GetActiveDepartmentsAsync(facultyId);
        return Ok(departments);
    }
}
