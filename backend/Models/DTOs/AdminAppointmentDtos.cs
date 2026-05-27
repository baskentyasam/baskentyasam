namespace ApiProject.Models.DTOs;

public class AdminAppointmentListQuery
{
    public int? TeacherId { get; set; }
    public int? FacultyId { get; set; }
    public int? DepartmentId { get; set; }
    public string? Status { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? Search { get; set; }
}

public class AdminAppointmentListItemDto
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public string? StudentNo { get; set; }
    public int TeacherId { get; set; }
    public string TeacherName { get; set; } = string.Empty;
    public string TeacherEmail { get; set; } = string.Empty;
    public int? TeacherFacultyId { get; set; }
    public string TeacherFacultyName { get; set; } = "Atanmamış";
    public int? TeacherDepartmentId { get; set; }
    public string TeacherDepartmentName { get; set; } = "Atanmamış";
    public DateTime Date { get; set; }
    public TimeSpan Time { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string RequestReason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string StatusDisplayName { get; set; } = string.Empty;
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}

public class AdminAppointmentTeacherListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsVisibleForAppointment { get; set; }
    public int? FacultyId { get; set; }
    public string FacultyName { get; set; } = "Atanmamış";
    public int? DepartmentId { get; set; }
    public string DepartmentName { get; set; } = "Atanmamış";
    public int TotalAppointments { get; set; }
    public int PendingAppointments { get; set; }
    public int ApprovedAppointments { get; set; }
    public int RejectedAppointments { get; set; }
}

public class AdminFacultyListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class AdminDepartmentListItemDto
{
    public int Id { get; set; }
    public int FacultyId { get; set; }
    public string FacultyName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class AdminFacultyWithDepartmentsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public List<AdminDepartmentListItemDto> Departments { get; set; } = new();
}

public class CancelAdminAppointmentDto
{
    public string? Reason { get; set; }
}

public class AssignTeacherDepartmentDto
{
    public int? DepartmentId { get; set; }
}

public class SetTeacherAppointmentVisibilityDto
{
    public bool IsVisibleForAppointment { get; set; }
}
