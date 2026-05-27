using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/cafeterias")]
public class CafeteriasController : ControllerBase
{
    private readonly IDirectoryService _directoryService;
    private readonly ICafeService _cafeService;

    public CafeteriasController(IDirectoryService directoryService, ICafeService cafeService)
    {
        _directoryService = directoryService;
        _cafeService = cafeService;
    }

    [HttpGet("active")]
    public async Task<ActionResult<List<CafeteriaListItemDto>>> GetActiveCafeterias()
    {
        var cafeterias = await _directoryService.GetActiveCafeteriasAsync();
        return Ok(cafeterias);
    }

    [HttpGet("{cafeteriaId:int}/menu")]
    public async Task<ActionResult> GetCafeteriaMenu(int cafeteriaId)
    {
        var menu = await _cafeService.GetMenuItemsAsync(cafeteriaId);
        return Ok(menu);
    }
}
