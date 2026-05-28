using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface IAdminAppointmentManagementService
{
    Task<List<AdminAppointmentListItemDto>> GetAppointmentsAsync(AdminAppointmentListQuery query);
    Task<AdminAppointmentListItemDto?> GetAppointmentByIdAsync(int id);
    Task<AdminAppointmentListItemDto?> CancelAppointmentAsync(int id, string? reason);
    Task<List<AdminAppointmentTeacherListItemDto>> GetTeachersAsync(
        string? search,
        bool? isActive,
        int? facultyId,
        int? departmentId);
    Task<List<ScheduleSlotResponseDto>> GetTeacherScheduleAsync(int teacherId);
    Task<List<AdminFacultyListItemDto>> GetFacultiesAsync();
    Task<List<AdminDepartmentListItemDto>> GetDepartmentsAsync(int? facultyId);
    Task<List<AdminFacultyWithDepartmentsDto>> GetFacultyHierarchyAsync();
    Task<AdminFacultyListItemDto> CreateFacultyAsync(CreateFacultyDto dto);
    Task<AdminFacultyListItemDto?> UpdateFacultyAsync(int id, UpdateFacultyDto dto);
    Task<AdminFacultyListItemDto?> ActivateFacultyAsync(int id);
    Task<AdminFacultyListItemDto?> DeactivateFacultyAsync(int id);
    Task<AdminDepartmentListItemDto> CreateDepartmentAsync(CreateDepartmentDto dto);
    Task<AdminDepartmentListItemDto?> UpdateDepartmentAsync(int id, UpdateDepartmentDto dto);
    Task<AdminDepartmentListItemDto?> ActivateDepartmentAsync(int id);
    Task<AdminDepartmentListItemDto?> DeactivateDepartmentAsync(int id);
    Task<AdminAppointmentTeacherListItemDto?> AssignTeacherDepartmentAsync(int teacherId, int? departmentId);
    Task<AdminAppointmentTeacherListItemDto?> SetTeacherAppointmentVisibilityAsync(int teacherId, bool isVisible);
}

public class AdminAppointmentManagementService : IAdminAppointmentManagementService
{
    private const string DefaultCancelReason = "Sistem yöneticisi tarafından iptal edildi.";
    private const string UnassignedLabel = "Atanmamış";

    private readonly AppDbContext _context;
    private readonly IAppointmentService _appointmentService;
    private readonly ScheduleService _scheduleService;

    public AdminAppointmentManagementService(
        AppDbContext context,
        IAppointmentService appointmentService,
        ScheduleService scheduleService)
    {
        _context = context;
        _appointmentService = appointmentService;
        _scheduleService = scheduleService;
    }

    public async Task<List<AdminAppointmentListItemDto>> GetAppointmentsAsync(AdminAppointmentListQuery query)
    {
        var appointmentsQuery = _context.Appointments
            .Include(a => a.Student)
            .Include(a => a.Teacher)
                .ThenInclude(t => t!.Department)
                    .ThenInclude(d => d!.Faculty)
            .AsQueryable();

        if (query.TeacherId.HasValue)
        {
            appointmentsQuery = appointmentsQuery.Where(a => a.TeacherId == query.TeacherId.Value);
        }

        if (query.DepartmentId.HasValue)
        {
            appointmentsQuery = appointmentsQuery.Where(a =>
                a.Teacher != null && a.Teacher.DepartmentId == query.DepartmentId.Value);
        }
        else if (query.FacultyId.HasValue)
        {
            appointmentsQuery = appointmentsQuery.Where(a =>
                a.Teacher != null &&
                a.Teacher.Department != null &&
                a.Teacher.Department.FacultyId == query.FacultyId.Value);
        }

        if (query.From.HasValue)
        {
            var from = query.From.Value.Date;
            appointmentsQuery = appointmentsQuery.Where(a => EF.Property<DateTime>(a, "ScheduledAt") >= from);
        }

        if (query.To.HasValue)
        {
            var to = query.To.Value.Date.AddDays(1).AddTicks(-1);
            appointmentsQuery = appointmentsQuery.Where(a => EF.Property<DateTime>(a, "ScheduledAt") <= to);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLowerInvariant();
            appointmentsQuery = appointmentsQuery.Where(a =>
                (a.Student != null && (a.Student.Name.ToLower().Contains(term) || a.Student.Email.ToLower().Contains(term))) ||
                (a.Student != null && a.Student.StudentNo != null && a.Student.StudentNo.ToLower().Contains(term)));
        }

        var appointments = await appointmentsQuery
            .OrderByDescending(a => EF.Property<DateTime>(a, "ScheduledAt"))
            .ToListAsync();

        await HydrateAppointmentsAsync(appointments);

        var items = appointments.Select(MapToListItem).ToList();

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var statusKey = query.Status.Trim();
            items = items.Where(i => i.Status.Equals(statusKey, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return items;
    }

    public async Task<AdminAppointmentListItemDto?> GetAppointmentByIdAsync(int id)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Student)
            .Include(a => a.Teacher)
                .ThenInclude(t => t!.Department)
                    .ThenInclude(d => d!.Faculty)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            return null;
        }

        await HydrateAppointmentsAsync(new List<Appointment> { appointment });
        return MapToListItem(appointment);
    }

    public async Task<AdminAppointmentListItemDto?> CancelAppointmentAsync(int id, string? reason)
    {
        var appointment = await _context.Appointments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            return null;
        }

        await HydrateAppointmentsAsync(new List<Appointment> { appointment });

        if (appointment.Status != AppointmentStatus.Pending)
        {
            throw new InvalidOperationException("Yalnızca bekleyen randevular iptal edilebilir.");
        }

        var cancelReason = string.IsNullOrWhiteSpace(reason) ? DefaultCancelReason : reason.Trim();
        var updated = await _appointmentService.RejectAppointmentAsync(id, cancelReason);

        if (updated == null)
        {
            return null;
        }

        await _context.Entry(updated).Reference(a => a.Teacher).LoadAsync();
        if (updated.Teacher != null)
        {
            await _context.Entry(updated.Teacher).Reference(t => t.Department).LoadAsync();
            if (updated.Teacher.Department != null)
            {
                await _context.Entry(updated.Teacher.Department).Reference(d => d.Faculty).LoadAsync();
            }
        }

        await HydrateAppointmentsAsync(new List<Appointment> { updated });
        return MapToListItem(updated);
    }

    public async Task<List<AdminAppointmentTeacherListItemDto>> GetTeachersAsync(
        string? search,
        bool? isActive,
        int? facultyId,
        int? departmentId)
    {
        var teachersQuery = _context.Users
            .AsNoTracking()
            .Include(u => u.Department)
                .ThenInclude(d => d!.Faculty)
            .Where(u => u.Role == UserRole.Teacher);

        if (isActive.HasValue)
        {
            teachersQuery = teachersQuery.Where(u => u.IsActive == isActive.Value);
        }

        if (departmentId.HasValue)
        {
            teachersQuery = teachersQuery.Where(u => u.DepartmentId == departmentId.Value);
        }
        else if (facultyId.HasValue)
        {
            teachersQuery = teachersQuery.Where(u =>
                u.Department != null && u.Department.FacultyId == facultyId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            teachersQuery = teachersQuery.Where(u =>
                u.Name.ToLower().Contains(term) || u.Email.ToLower().Contains(term));
        }

        var teachers = await teachersQuery.OrderBy(u => u.Name).ToListAsync();
        var teacherIds = teachers.Select(t => t.Id).ToList();

        var appointments = await _context.Appointments
            .Where(a => teacherIds.Contains(a.TeacherId))
            .ToListAsync();

        await HydrateAppointmentsAsync(appointments);

        return teachers.Select(teacher => MapTeacherListItem(teacher, appointments)).ToList();
    }

    public async Task<List<ScheduleSlotResponseDto>> GetTeacherScheduleAsync(int teacherId)
    {
        var exists = await _context.Users.AnyAsync(u => u.Id == teacherId && u.Role == UserRole.Teacher);
        if (!exists)
        {
            throw new KeyNotFoundException("Öğretim elemanı bulunamadı.");
        }

        return await _scheduleService.GetScheduleByInstructorIdAsync(teacherId);
    }

    public async Task<List<AdminFacultyListItemDto>> GetFacultiesAsync()
    {
        return await _context.Faculties
            .AsNoTracking()
            .Where(f => f.IsActive)
            .OrderBy(f => f.Name)
            .Select(f => new AdminFacultyListItemDto
            {
                Id = f.Id,
                Name = f.Name,
                IsActive = f.IsActive,
            })
            .ToListAsync();
    }

    public async Task<List<AdminDepartmentListItemDto>> GetDepartmentsAsync(int? facultyId)
    {
        var query = _context.Departments
            .AsNoTracking()
            .Include(d => d.Faculty)
            .Where(d => d.IsActive);

        if (facultyId.HasValue)
        {
            query = query.Where(d => d.FacultyId == facultyId.Value);
        }

        return await query
            .OrderBy(d => d.Faculty!.Name)
            .ThenBy(d => d.Name)
            .Select(d => new AdminDepartmentListItemDto
            {
                Id = d.Id,
                FacultyId = d.FacultyId,
                FacultyName = d.Faculty!.Name,
                Name = d.Name,
                IsActive = d.IsActive,
            })
            .ToListAsync();
    }

    public async Task<List<AdminFacultyWithDepartmentsDto>> GetFacultyHierarchyAsync()
    {
        var faculties = await _context.Faculties
            .AsNoTracking()
            .OrderBy(f => f.Name)
            .ToListAsync();

        var departments = await _context.Departments
            .AsNoTracking()
            .Include(d => d.Faculty)
            .OrderBy(d => d.Name)
            .ToListAsync();

        return faculties.Select(f => new AdminFacultyWithDepartmentsDto
        {
            Id = f.Id,
            Name = f.Name,
            IsActive = f.IsActive,
            Departments = departments
                .Where(d => d.FacultyId == f.Id)
                .Select(d => new AdminDepartmentListItemDto
                {
                    Id = d.Id,
                    FacultyId = d.FacultyId,
                    FacultyName = f.Name,
                    Name = d.Name,
                    IsActive = d.IsActive,
                })
                .ToList(),
        }).ToList();
    }

    public async Task<AdminFacultyListItemDto> CreateFacultyAsync(CreateFacultyDto dto)
    {
        var name = NormalizeName(dto.Name);
        await EnsureUniqueActiveFacultyNameAsync(name);

        var faculty = new Faculty
        {
            Name = name,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Faculties.Add(faculty);
        await _context.SaveChangesAsync();

        return MapFacultyListItem(faculty);
    }

    public async Task<AdminFacultyListItemDto?> UpdateFacultyAsync(int id, UpdateFacultyDto dto)
    {
        var faculty = await _context.Faculties.FirstOrDefaultAsync(f => f.Id == id);
        if (faculty == null)
        {
            return null;
        }

        var name = NormalizeName(dto.Name);
        await EnsureUniqueActiveFacultyNameAsync(name, id);

        faculty.Name = name;
        await _context.SaveChangesAsync();

        return MapFacultyListItem(faculty);
    }

    public async Task<AdminFacultyListItemDto?> ActivateFacultyAsync(int id)
    {
        var faculty = await _context.Faculties.FirstOrDefaultAsync(f => f.Id == id);
        if (faculty == null)
        {
            return null;
        }

        var name = NormalizeName(faculty.Name);
        await EnsureUniqueActiveFacultyNameAsync(name, id);

        faculty.IsActive = true;
        await _context.SaveChangesAsync();

        return MapFacultyListItem(faculty);
    }

    public async Task<AdminFacultyListItemDto?> DeactivateFacultyAsync(int id)
    {
        var faculty = await _context.Faculties.FirstOrDefaultAsync(f => f.Id == id);
        if (faculty == null)
        {
            return null;
        }

        faculty.IsActive = false;
        await _context.SaveChangesAsync();

        return MapFacultyListItem(faculty);
    }

    public async Task<AdminDepartmentListItemDto> CreateDepartmentAsync(CreateDepartmentDto dto)
    {
        var faculty = await _context.Faculties.FirstOrDefaultAsync(f => f.Id == dto.FacultyId);
        if (faculty == null)
        {
            throw new InvalidOperationException("Fakülte bulunamadı.");
        }

        if (!faculty.IsActive)
        {
            throw new InvalidOperationException("Pasif fakülteye bölüm eklenemez. Önce fakülteyi aktifleştirin.");
        }

        var name = NormalizeName(dto.Name);
        await EnsureUniqueActiveDepartmentNameAsync(faculty.Id, name);

        var department = new Department
        {
            FacultyId = faculty.Id,
            Name = name,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        return MapDepartmentListItem(department, faculty);
    }

    public async Task<AdminDepartmentListItemDto?> UpdateDepartmentAsync(int id, UpdateDepartmentDto dto)
    {
        var department = await _context.Departments
            .Include(d => d.Faculty)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
        {
            return null;
        }

        var name = NormalizeName(dto.Name);
        await EnsureUniqueActiveDepartmentNameAsync(department.FacultyId, name, id);

        department.Name = name;
        await _context.SaveChangesAsync();

        return MapDepartmentListItem(department, department.Faculty);
    }

    public async Task<AdminDepartmentListItemDto?> ActivateDepartmentAsync(int id)
    {
        var department = await _context.Departments
            .Include(d => d.Faculty)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
        {
            return null;
        }

        if (!department.Faculty.IsActive)
        {
            throw new InvalidOperationException("Bağlı fakülte pasif. Önce fakülteyi aktifleştirin.");
        }

        var name = NormalizeName(department.Name);
        await EnsureUniqueActiveDepartmentNameAsync(department.FacultyId, name, id);

        department.IsActive = true;
        await _context.SaveChangesAsync();

        return MapDepartmentListItem(department, department.Faculty);
    }

    public async Task<AdminDepartmentListItemDto?> DeactivateDepartmentAsync(int id)
    {
        var department = await _context.Departments
            .Include(d => d.Faculty)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
        {
            return null;
        }

        department.IsActive = false;
        await _context.SaveChangesAsync();

        return MapDepartmentListItem(department, department.Faculty);
    }

    public async Task<AdminAppointmentTeacherListItemDto?> AssignTeacherDepartmentAsync(int teacherId, int? departmentId)
    {
        var teacher = await _context.Users
            .Include(u => u.Department)
                .ThenInclude(d => d!.Faculty)
            .FirstOrDefaultAsync(u => u.Id == teacherId && u.Role == UserRole.Teacher);

        if (teacher == null)
        {
            return null;
        }

        if (departmentId.HasValue)
        {
            var department = await _context.Departments
                .Include(d => d.Faculty)
                .FirstOrDefaultAsync(d =>
                    d.Id == departmentId.Value && d.IsActive && d.Faculty.IsActive);

            if (department == null)
            {
                throw new InvalidOperationException("Geçerli ve aktif bir bölüm seçin.");
            }

            teacher.DepartmentId = department.Id;
            teacher.Department = department;
        }
        else
        {
            teacher.DepartmentId = null;
            teacher.Department = null;
        }

        await _context.SaveChangesAsync();

        var appointments = await _context.Appointments.Where(a => a.TeacherId == teacher.Id).ToListAsync();
        await HydrateAppointmentsAsync(appointments);
        return MapTeacherListItem(teacher, appointments);
    }

    public async Task<AdminAppointmentTeacherListItemDto?> SetTeacherAppointmentVisibilityAsync(
        int teacherId,
        bool isVisible)
    {
        var teacher = await _context.Users
            .Include(u => u.Department)
                .ThenInclude(d => d!.Faculty)
            .FirstOrDefaultAsync(u => u.Id == teacherId && u.Role == UserRole.Teacher);

        if (teacher == null)
        {
            return null;
        }

        teacher.IsVisibleForAppointment = isVisible;
        await _context.SaveChangesAsync();

        var appointments = await _context.Appointments.Where(a => a.TeacherId == teacher.Id).ToListAsync();
        await HydrateAppointmentsAsync(appointments);
        return MapTeacherListItem(teacher, appointments);
    }

    private static AdminAppointmentTeacherListItemDto MapTeacherListItem(User teacher, List<Appointment> allAppointments)
    {
        var teacherAppointments = allAppointments.Where(a => a.TeacherId == teacher.Id).ToList();
        var dept = teacher.Department;
        var faculty = dept?.Faculty;

        return new AdminAppointmentTeacherListItemDto
        {
            Id = teacher.Id,
            Name = teacher.Name,
            Email = teacher.Email,
            IsActive = teacher.IsActive,
            IsVisibleForAppointment = teacher.IsVisibleForAppointment,
            FacultyId = faculty?.Id,
            FacultyName = faculty?.Name ?? UnassignedLabel,
            FacultyIsActive = faculty?.IsActive,
            DepartmentId = dept?.Id,
            DepartmentName = dept?.Name ?? UnassignedLabel,
            DepartmentIsActive = dept?.IsActive,
            TotalAppointments = teacherAppointments.Count,
            PendingAppointments = teacherAppointments.Count(a => a.Status == AppointmentStatus.Pending),
            ApprovedAppointments = teacherAppointments.Count(a => a.Status == AppointmentStatus.Approved),
            RejectedAppointments = teacherAppointments.Count(a => a.Status == AppointmentStatus.Rejected),
        };
    }

    private async Task HydrateAppointmentsAsync(List<Appointment> appointments)
    {
        if (appointments.Count == 0)
        {
            return;
        }

        var connection = _context.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen)
        {
            await connection.OpenAsync();
        }

        try
        {
            foreach (var appointment in appointments)
            {
                var scheduledAt = _context.Entry(appointment).Property<DateTime>("ScheduledAt").CurrentValue;
                appointment.Date = scheduledAt.Date;
                appointment.Time = scheduledAt.TimeOfDay;

                string? rejectionReasonValue = null;
                using (var checkCmd = connection.CreateCommand())
                {
                    checkCmd.CommandText = $"SELECT \"rejection_reason\" FROM \"appointments\" WHERE \"id\" = {appointment.Id}";
                    var scalar = await checkCmd.ExecuteScalarAsync();
                    rejectionReasonValue = scalar == null || DBNull.Value.Equals(scalar) ? null : scalar.ToString();
                }

                if (!appointment.UpdatedAt.HasValue)
                {
                    appointment.Status = AppointmentStatus.Pending;
                    appointment.RejectionReason = null;
                }
                else if (!string.IsNullOrWhiteSpace(rejectionReasonValue))
                {
                    appointment.Status = AppointmentStatus.Rejected;
                    appointment.RejectionReason = rejectionReasonValue;
                }
                else
                {
                    appointment.Status = AppointmentStatus.Approved;
                    appointment.RejectionReason = null;
                }

                if (string.IsNullOrWhiteSpace(appointment.RequestReason))
                {
                    try
                    {
                        using var reasonCommand = connection.CreateCommand();
                        reasonCommand.CommandText = $"SELECT \"request_reason\" FROM \"appointments\" WHERE \"id\" = {appointment.Id}";
                        var reasonResult = await reasonCommand.ExecuteScalarAsync();
                        if (reasonResult != null && !DBNull.Value.Equals(reasonResult))
                        {
                            var reasonText = reasonResult.ToString();
                            appointment.RequestReason = !string.IsNullOrWhiteSpace(reasonText)
                                ? reasonText
                                : "Belirtilmemiş";
                        }
                        else
                        {
                            appointment.RequestReason = "Belirtilmemiş";
                        }
                    }
                    catch
                    {
                        appointment.RequestReason = "Belirtilmemiş";
                    }
                }
            }
        }
        finally
        {
            if (!wasOpen)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static AdminAppointmentListItemDto MapToListItem(Appointment appointment)
    {
        var teacher = appointment.Teacher;
        var dept = teacher?.Department;
        var faculty = dept?.Faculty;
        var status = appointment.Status.ToString();

        return new AdminAppointmentListItemDto
        {
            Id = appointment.Id,
            StudentId = appointment.StudentId,
            StudentName = appointment.Student?.Name ?? "Bilinmiyor",
            StudentEmail = appointment.Student?.Email ?? "—",
            StudentNo = appointment.Student?.StudentNo,
            TeacherId = appointment.TeacherId,
            TeacherName = teacher?.Name ?? "Bilinmiyor",
            TeacherEmail = teacher?.Email ?? "—",
            TeacherFacultyId = faculty?.Id,
            TeacherFacultyName = faculty?.Name ?? UnassignedLabel,
            TeacherDepartmentId = dept?.Id,
            TeacherDepartmentName = dept?.Name ?? UnassignedLabel,
            Date = appointment.Date,
            Time = appointment.Time,
            Subject = appointment.Subject,
            RequestReason = appointment.RequestReason ?? "Belirtilmemiş",
            Status = status,
            StatusDisplayName = GetStatusDisplayName(appointment.Status),
            RejectionReason = appointment.RejectionReason,
            CreatedAt = appointment.CreatedAt,
            RespondedAt = appointment.UpdatedAt,
        };
    }

    private static string GetStatusDisplayName(AppointmentStatus status) => status switch
    {
        AppointmentStatus.Pending => "Bekliyor",
        AppointmentStatus.Approved => "Onaylandı",
        AppointmentStatus.Rejected => "Reddedildi / İptal",
        AppointmentStatus.Cancelled => "İptal",
        AppointmentStatus.Completed => "Tamamlandı",
        _ => status.ToString(),
    };

    private static string NormalizeName(string name)
    {
        var trimmed = name.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new InvalidOperationException("Ad boş olamaz.");
        }

        return trimmed;
    }

    private async Task EnsureUniqueActiveFacultyNameAsync(string name, int? excludeId = null)
    {
        var normalized = name.ToLower();
        var exists = await _context.Faculties.AnyAsync(f =>
            f.IsActive &&
            f.Name.ToLower() == normalized &&
            (!excludeId.HasValue || f.Id != excludeId.Value));

        if (exists)
        {
            throw new InvalidOperationException("Bu isimde aktif bir fakülte zaten var.");
        }
    }

    private async Task EnsureUniqueActiveDepartmentNameAsync(int facultyId, string name, int? excludeId = null)
    {
        var normalized = name.ToLower();
        var exists = await _context.Departments.AnyAsync(d =>
            d.FacultyId == facultyId &&
            d.IsActive &&
            d.Name.ToLower() == normalized &&
            (!excludeId.HasValue || d.Id != excludeId.Value));

        if (exists)
        {
            throw new InvalidOperationException("Bu fakültede aynı isimde aktif bir bölüm zaten var.");
        }
    }

    private static AdminFacultyListItemDto MapFacultyListItem(Faculty faculty) => new()
    {
        Id = faculty.Id,
        Name = faculty.Name,
        IsActive = faculty.IsActive,
    };

    private static AdminDepartmentListItemDto MapDepartmentListItem(Department department, Faculty faculty) => new()
    {
        Id = department.Id,
        FacultyId = department.FacultyId,
        FacultyName = faculty.Name,
        Name = department.Name,
        IsActive = department.IsActive,
    };
}

