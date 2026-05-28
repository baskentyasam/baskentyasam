using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface IDirectoryService
{
    Task<List<CafeteriaListItemDto>> GetActiveCafeteriasAsync();
    Task<List<ParkingLotListItemDto>> GetActiveParkingLotsAsync();
    Task<List<LibraryAreaListItemDto>> GetActiveLibraryAreasAsync();
    Task<List<AssignableScopeDto>> GetAssignableScopesAsync(AdminModuleType moduleType);
    Task<List<FacultyListItemDto>> GetActiveFacultiesAsync();
    Task<List<DepartmentListItemDto>> GetActiveDepartmentsAsync(int? facultyId);
}

public class DirectoryService : IDirectoryService
{
    private readonly AppDbContext _context;

    public DirectoryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CafeteriaListItemDto>> GetActiveCafeteriasAsync()
    {
        return await _context.Cafeterias
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new CafeteriaListItemDto
            {
                Id = c.Id,
                Name = c.Name,
                Location = c.Location,
                Description = c.Description
            })
            .ToListAsync();
    }

    public async Task<List<ParkingLotListItemDto>> GetActiveParkingLotsAsync()
    {
        return await _context.ParkingLots
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => new ParkingLotListItemDto
            {
                Id = p.Id,
                Name = p.Name,
                Location = p.Location,
                Capacity = p.Capacity,
                CurrentOccupancy = p.CurrentOccupancy,
                AvailableSlots = Math.Max(p.Capacity - p.CurrentOccupancy, 0)
            })
            .ToListAsync();
    }

    public async Task<List<LibraryAreaListItemDto>> GetActiveLibraryAreasAsync()
    {
        return await _context.LibraryAreas
            .AsNoTracking()
            .Where(l => l.IsActive)
            .OrderBy(l => l.Name)
            .Select(l => new LibraryAreaListItemDto
            {
                Id = l.Id,
                Name = l.Name,
                Location = l.Location,
                Capacity = l.Capacity,
                CurrentOccupancy = l.CurrentOccupancy,
                AvailableSlots = Math.Max(l.Capacity - l.CurrentOccupancy, 0),
            })
            .ToListAsync();
    }

    public async Task<List<AssignableScopeDto>> GetAssignableScopesAsync(AdminModuleType moduleType)
    {
        if (moduleType == AdminModuleType.Cafeteria)
        {
            return await _context.Cafeterias
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new AssignableScopeDto
                {
                    ScopeKey = c.Id.ToString(),
                    ScopeDisplayName = c.Name
                })
                .ToListAsync();
        }

        if (moduleType == AdminModuleType.Parking)
        {
            return await _context.ParkingLots
                .AsNoTracking()
                .Where(p => p.IsActive)
                .OrderBy(p => p.Name)
                .Select(p => new AssignableScopeDto
                {
                    ScopeKey = p.Id.ToString(),
                    ScopeDisplayName = p.Name
                })
                .ToListAsync();
        }

        return new List<AssignableScopeDto>();
    }

    public async Task<List<FacultyListItemDto>> GetActiveFacultiesAsync()
    {
        return await _context.Faculties
            .AsNoTracking()
            .Where(f => f.IsActive)
            .OrderBy(f => f.Name)
            .Select(f => new FacultyListItemDto
            {
                Id = f.Id,
                Name = f.Name,
            })
            .ToListAsync();
    }

    public async Task<List<DepartmentListItemDto>> GetActiveDepartmentsAsync(int? facultyId)
    {
        var query = _context.Departments
            .AsNoTracking()
            .Where(d => d.IsActive && d.Faculty.IsActive);

        if (facultyId.HasValue)
        {
            query = query.Where(d => d.FacultyId == facultyId.Value);
        }

        return await query
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentListItemDto
            {
                Id = d.Id,
                FacultyId = d.FacultyId,
                Name = d.Name,
            })
            .ToListAsync();
    }
}
