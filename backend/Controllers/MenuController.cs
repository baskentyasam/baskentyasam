using ApiProject.Models;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MenuController : ControllerBase
{
    private readonly ICafeService _cafeService;

    public MenuController(ICafeService cafeService)
    {
        _cafeService = cafeService;
    }

    [HttpGet]
    public async Task<ActionResult<List<MenuItem>>> GetMenuItems([FromQuery] int? cafeteriaId)
    {
        var menuItems = await _cafeService.GetMenuItemsAsync(cafeteriaId);
        return Ok(menuItems);
    }

    [HttpGet("by-cafeteria/{cafeteriaId:int}")]
    public async Task<ActionResult<List<MenuItem>>> GetMenuItemsByCafeteria(int cafeteriaId)
    {
        var menuItems = await _cafeService.GetMenuItemsAsync(cafeteriaId);
        return Ok(menuItems);
    }
}

