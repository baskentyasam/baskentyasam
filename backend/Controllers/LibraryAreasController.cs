using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/library-areas")]
public class LibraryAreasController : ControllerBase
{
    private readonly ILibraryManagementService _libraryService;

    public LibraryAreasController(ILibraryManagementService libraryService)
    {
        _libraryService = libraryService;
    }

    /// <summary>
    /// Geriye dönük uyumluluk: tek kütüphane özeti döner.
    /// </summary>
    [HttpGet("active")]
    public async Task<ActionResult<List<LibraryAreaListItemDto>>> GetActiveLibraryAreas()
    {
        var snapshot = await _libraryService.GetPublicSnapshotAsync();
        return Ok(new List<LibraryAreaListItemDto>
        {
            new()
            {
                Id = 1,
                Name = "Kütüphane",
                Location = "Merkez Kampüs",
                Capacity = snapshot.OpenCapacity,
                CurrentOccupancy = snapshot.CurrentOccupancy,
                AvailableSlots = snapshot.AvailableSlots,
            },
        });
    }
}
