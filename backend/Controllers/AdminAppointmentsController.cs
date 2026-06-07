using System.Security.Claims;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using ApiProject.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ApiProject.Controllers;

[ApiController]
[Route("api/admin/appointments")]
[Authorize(Roles = "SuperAdmin,SubAdmin")]
public class AdminAppointmentsController : ControllerBase
{
    private readonly IAdminAppointmentManagementService _adminAppointmentService;
    private readonly IAdminAuthorizationService _adminAuthorizationService;

    public AdminAppointmentsController(
        IAdminAppointmentManagementService adminAppointmentService,
        IAdminAuthorizationService adminAuthorizationService)
    {
        _adminAppointmentService = adminAppointmentService;
        _adminAuthorizationService = adminAuthorizationService;
    }

    [HttpGet]
    public async Task<ActionResult<List<AdminAppointmentListItemDto>>> GetAppointments(
        [FromQuery] int? teacherId,
        [FromQuery] int? facultyId,
        [FromQuery] int? departmentId,
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? search)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        var result = await _adminAppointmentService.GetAppointmentsAsync(new AdminAppointmentListQuery
        {
            TeacherId = teacherId,
            FacultyId = facultyId,
            DepartmentId = departmentId,
            Status = status,
            From = from,
            To = to,
            Search = search,
        });
        return Ok(result);
    }

    [HttpGet("faculties")]
    public async Task<ActionResult<List<AdminFacultyListItemDto>>> GetFaculties()
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        return Ok(await _adminAppointmentService.GetFacultiesAsync());
    }

    [HttpGet("faculties/hierarchy")]
    public async Task<ActionResult<List<AdminFacultyWithDepartmentsDto>>> GetFacultyHierarchy()
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        return Ok(await _adminAppointmentService.GetFacultyHierarchyAsync());
    }

    [HttpPost("faculties")]
    public async Task<ActionResult<AdminFacultyListItemDto>> CreateFaculty([FromBody] CreateFacultyDto dto)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var created = await _adminAppointmentService.CreateFacultyAsync(dto);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("faculties/{id:int}")]
    public async Task<ActionResult<AdminFacultyListItemDto>> UpdateFaculty(int id, [FromBody] UpdateFacultyDto dto)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var updated = await _adminAppointmentService.UpdateFacultyAsync(id, dto);
            if (updated == null)
            {
                return NotFound(new { message = "Fakülte bulunamadı." });
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("faculties/{id:int}/activate")]
    public async Task<ActionResult<AdminFacultyListItemDto>> ActivateFaculty(int id)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var updated = await _adminAppointmentService.ActivateFacultyAsync(id);
            if (updated == null)
            {
                return NotFound(new { message = "Fakülte bulunamadı." });
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("faculties/{id:int}/deactivate")]
    public async Task<ActionResult<AdminFacultyListItemDto>> DeactivateFaculty(int id)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var updated = await _adminAppointmentService.DeactivateFacultyAsync(id);
            if (updated == null)
            {
                return NotFound(new { message = "Fakülte bulunamadı." });
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("departments")]
    public async Task<ActionResult<AdminDepartmentListItemDto>> CreateDepartment([FromBody] CreateDepartmentDto dto)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var created = await _adminAppointmentService.CreateDepartmentAsync(dto);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("departments/{id:int}")]
    public async Task<ActionResult<AdminDepartmentListItemDto>> UpdateDepartment(int id, [FromBody] UpdateDepartmentDto dto)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var updated = await _adminAppointmentService.UpdateDepartmentAsync(id, dto);
            if (updated == null)
            {
                return NotFound(new { message = "Bölüm bulunamadı." });
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("departments/{id:int}/activate")]
    public async Task<ActionResult<AdminDepartmentListItemDto>> ActivateDepartment(int id)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var updated = await _adminAppointmentService.ActivateDepartmentAsync(id);
            if (updated == null)
            {
                return NotFound(new { message = "Bölüm bulunamadı." });
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("departments/{id:int}/deactivate")]
    public async Task<ActionResult<AdminDepartmentListItemDto>> DeactivateDepartment(int id)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var updated = await _adminAppointmentService.DeactivateDepartmentAsync(id);
            if (updated == null)
            {
                return NotFound(new { message = "Bölüm bulunamadı." });
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("departments")]
    public async Task<ActionResult<List<AdminDepartmentListItemDto>>> GetDepartments([FromQuery] int? facultyId)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        return Ok(await _adminAppointmentService.GetDepartmentsAsync(facultyId));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminAppointmentListItemDto>> GetAppointment(int id)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        var item = await _adminAppointmentService.GetAppointmentByIdAsync(id);
        if (item == null)
        {
            return NotFound(new { message = "Randevu bulunamadı." });
        }

        return Ok(item);
    }

    [HttpPut("{id:int}/cancel")]
    public async Task<ActionResult<AdminAppointmentListItemDto>> CancelAppointment(
        int id,
        [FromBody] CancelAdminAppointmentDto? dto)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var updated = await _adminAppointmentService.CancelAppointmentAsync(id, dto?.Reason);
            if (updated == null)
            {
                return NotFound(new { message = "Randevu bulunamadı." });
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("teachers")]
    public async Task<ActionResult<List<AdminAppointmentTeacherListItemDto>>> GetTeachers(
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] int? facultyId,
        [FromQuery] int? departmentId)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        var result = await _adminAppointmentService.GetTeachersAsync(search, isActive, facultyId, departmentId);
        return Ok(result);
    }

    [HttpPut("teachers/{teacherId:int}/department")]
    public async Task<ActionResult<AdminAppointmentTeacherListItemDto>> AssignTeacherDepartment(
        int teacherId,
        [FromBody] AssignTeacherDepartmentDto dto)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var updated = await _adminAppointmentService.AssignTeacherDepartmentAsync(teacherId, dto.DepartmentId);
            if (updated == null)
            {
                return NotFound(new { message = "Öğretim elemanı bulunamadı." });
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("teachers/{teacherId:int}/appointment-visibility")]
    public async Task<ActionResult<AdminAppointmentTeacherListItemDto>> SetTeacherAppointmentVisibility(
        int teacherId,
        [FromBody] SetTeacherAppointmentVisibilityDto dto)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        var updated = await _adminAppointmentService.SetTeacherAppointmentVisibilityAsync(
            teacherId,
            dto.IsVisibleForAppointment);

        if (updated == null)
        {
            return NotFound(new { message = "Öğretim elemanı bulunamadı." });
        }

        return Ok(updated);
    }

    [HttpGet("teachers/{teacherId:int}/schedule")]
    public async Task<ActionResult<List<ScheduleSlotResponseDto>>> GetTeacherSchedule(int teacherId)
    {
        var denied = await EnsureAppointmentAccessAsync();
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var schedule = await _adminAppointmentService.GetTeacherScheduleAsync(teacherId);
            return Ok(schedule);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    private async Task<ActionResult?> EnsureAppointmentAccessAsync()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        if (await _adminAuthorizationService.IsSuperAdminAsync(userId.Value))
        {
            return null;
        }

        try
        {
            await _adminAuthorizationService.EnsureModuleScopeAccessAsync(
                userId.Value,
                AdminModuleType.Appointment,
                AdminAssignableScopes.AppointmentScopeKey);
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}

