using System.ComponentModel.DataAnnotations;

namespace ApiProject.Models.DTOs;

public class OccupancyPushDto
{
    [Range(0, 10000, ErrorMessage = "Giriş sayısı 0-10000 aralığında olmalıdır")]
    public int In { get; set; }

    [Range(0, 10000, ErrorMessage = "Çıkış sayısı 0-10000 aralığında olmalıdır")]
    public int Out { get; set; }
}
