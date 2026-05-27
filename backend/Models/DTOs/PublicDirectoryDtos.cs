namespace ApiProject.Models.DTOs;

public class CafeteriaListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? Description { get; set; }
}

public class ParkingLotListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public int Capacity { get; set; }
    public int CurrentOccupancy { get; set; }
    public int AvailableSlots { get; set; }
}

public class AssignableScopeDto
{
    public string ScopeKey { get; set; } = string.Empty;
    public string ScopeDisplayName { get; set; } = string.Empty;
}

public class FacultyListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class DepartmentListItemDto
{
    public int Id { get; set; }
    public int FacultyId { get; set; }
    public string Name { get; set; } = string.Empty;
}
