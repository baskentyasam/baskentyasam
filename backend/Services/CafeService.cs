using ApiProject.Data;
using ApiProject.Models;
using ApiProject.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ApiProject.Services;

public interface ICafeService
{
    Task<List<MenuItem>> GetMenuItemsAsync(int? cafeteriaId = null);
    Task<CafeteriaOrderResponseDto> CreateOrderAsync(int userId, CreateOrderDto createOrderDto);
    Task<List<CafeteriaOrderResponseDto>> GetUserOrdersAsync(int userId);
    /// <summary>Durumu NotPaid (Ödenmedi) olan siparişlerin sayısı ve listesi.</summary>
    Task<MyUnpaidOrdersSummaryDto> GetMyNotPaidOrdersAsync(int userId);
    Task<List<PickupTimeDensityDto>> GetPickupTimeDensityAsync();
}

public class CafeService : ICafeService
{
    /// <summary>Aynı anda en fazla bu kadar "Ödenmedi" siparişe izin verilir; üstünde yeni sipariş engellenir.</summary>
    public const int MaxNotPaidOrdersPerUser = 3;

    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;

    public CafeService(AppDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    private static readonly Dictionary<OrderStatus, string> StatusToTurkish = new()
    {
        { OrderStatus.Received, "Onaylanması Bekleniyor" },
        { OrderStatus.Approved, "Hazırlanıyor" },
        { OrderStatus.Preparing, "Hazırlanıyor" },
        { OrderStatus.Ready, "Hazırlandı" },
        { OrderStatus.Paid, "Teslim Alındı" },
        { OrderStatus.Cancelled, "İptal Edildi" },
        { OrderStatus.NotPaid, "Ödenmedi" },
    };

    public async Task<List<MenuItem>> GetMenuItemsAsync(int? cafeteriaId = null)
    {
        var query = _context.MenuItems
            .Where(m => m.IsAvailable)
            .AsQueryable();

        if (cafeteriaId.HasValue)
        {
            query = query.Where(m => m.CafeteriaId == cafeteriaId.Value);
        }

        return await query
            .OrderBy(m => m.Name)
            .ToListAsync();
    }

    public async Task<CafeteriaOrderResponseDto> CreateOrderAsync(int userId, CreateOrderDto createOrderDto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("Kullanıcı bulunamadı.");

        var notPaidCount = await _context.Orders
            .CountAsync(o => o.UserId == userId && o.Status == OrderStatus.NotPaid);

        if (notPaidCount >= MaxNotPaidOrdersPerUser)
        {
            throw new InvalidOperationException(
                "Ödenmemiş sipariş limitine ulaştınız. Yeni sipariş vermeden önce lütfen eski siparişlerinizin ödemesini tamamlayın.");
        }

        if (createOrderDto.CafeteriaId <= 0)
        {
            throw new InvalidOperationException("Geçerli bir kafeterya seçmelisiniz.");
        }

        var cafeteriaIdForOrder = createOrderDto.CafeteriaId;
        var cafeteria = await _context.Cafeterias.FirstOrDefaultAsync(c => c.Id == cafeteriaIdForOrder);
        if (cafeteria == null || !cafeteria.IsActive)
        {
            throw new InvalidOperationException("Seçilen kafeterya aktif değil veya bulunamadı.");
        }

        decimal totalAmount = 0;
        var orderItems = new List<OrderItem>();

        foreach (var itemDto in createOrderDto.OrderItems)
        {
            var menuItem = await _context.MenuItems.FindAsync(itemDto.MenuItemId);
            if (menuItem == null)
                throw new InvalidOperationException($"Menü öğesi bulunamadı. ID: {itemDto.MenuItemId}");

            if (!menuItem.IsAvailable)
                throw new InvalidOperationException($"{menuItem.Name} şu anda sipariş edilemiyor.");

            if (!menuItem.CafeteriaId.HasValue || menuItem.CafeteriaId.Value != cafeteriaIdForOrder)
            {
                throw new InvalidOperationException("Seçilen ürünler bu kafeteryaya ait değil.");
            }

            var orderItem = new OrderItem
            {
                MenuItemId = itemDto.MenuItemId,
                Quantity = itemDto.Quantity,
                Price = menuItem.Price
            };

            totalAmount += menuItem.Price * itemDto.Quantity;
            orderItems.Add(orderItem);
        }

        var order = new Order
        {
            UserId = userId,
            UserType = user.Role is UserRole.Student or UserRole.Personnel
                ? OrderUserType.Student
                : OrderUserType.Staff,
            CreatedAt = DateTime.UtcNow,
            OrderNumber = GenerateOrderNumber(),
            Status = OrderStatus.Received,
            IsPaid = false,
            TotalAmount = totalAmount,
            PickupTime = createOrderDto.PickupTime,
            Note = createOrderDto.Note,
            CafeteriaId = cafeteriaIdForOrder,
            OrderItems = orderItems
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        await _context.Entry(order).Reference(o => o.Cafeteria).LoadAsync();
        await _context.Entry(order)
            .Collection(o => o.OrderItems)
            .Query()
            .Include(oi => oi.MenuItem)
            .LoadAsync();

        try
        {
            await _notificationService.SendNotificationAsync(
                "Sipariş Alındı",
                $"#{order.OrderNumber} numaralı siparişiniz alındı. Onay bekleniyor.",
                NotificationType.OrderReceived,
                user.Email,
                userId);
        }
        catch { }

        return MapToResponseDto(order);
    }

    public async Task<List<CafeteriaOrderResponseDto>> GetUserOrdersAsync(int userId)
    {
        var orders = await _context.Orders
            .Where(o => o.UserId == userId)
            .Include(o => o.Cafeteria)
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.MenuItem)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return orders.Select(MapToResponseDto).ToList();
    }

    public async Task<MyUnpaidOrdersSummaryDto> GetMyNotPaidOrdersAsync(int userId)
    {
        var orders = await _context.Orders
            .Where(o => o.UserId == userId && o.Status == OrderStatus.NotPaid)
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.MenuItem)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var totalDebt = orders.Sum(o => o.TotalAmount);

        return new MyUnpaidOrdersSummaryDto
        {
            Count = orders.Count,
            TotalDebt = totalDebt,
            UnpaidLimit = MaxNotPaidOrdersPerUser,
            Orders = orders.Select(MapToResponseDto).ToList()
        };
    }

    private CafeteriaOrderResponseDto MapToResponseDto(Order order)
    {
        var now = DateTime.UtcNow;
        var diff = now - order.CreatedAt;
        string createdAt;

        if (diff.TotalMinutes < 1)
            createdAt = "Az önce";
        else if (diff.TotalMinutes < 60)
            createdAt = $"{(int)diff.TotalMinutes} dk önce";
        else if (diff.TotalHours < 24)
            createdAt = $"Bugün, {order.CreatedAt.ToLocalTime():HH:mm}";
        else if (diff.TotalHours < 48)
            createdAt = $"Dün, {order.CreatedAt.ToLocalTime():HH:mm}";
        else
            createdAt = order.CreatedAt.ToLocalTime().ToString("dd.MM.yyyy, HH:mm");

        return new CafeteriaOrderResponseDto
        {
            Id = order.Id,
            CafeteriaId = order.CafeteriaId,
            CafeteriaName = order.Cafeteria?.Name,
            OrderNumber = order.OrderNumber,
            CreatedAtUtc = order.CreatedAt,
            Items = order.OrderItems.Select(oi => new CafeteriaOrderItemResponseDto
            {
                MenuItemId = oi.MenuItemId,
                Name = oi.MenuItem?.Name ?? "Bilinmeyen Ürün",
                Quantity = oi.Quantity,
                Price = oi.Price
            }).ToList(),
            TotalPrice = order.TotalAmount,
            PickupTime = order.PickupTime ?? "",
            Note = order.Note,
            Status = StatusToTurkish.GetValueOrDefault(order.Status, "Bilinmeyen"),
            CreatedAt = createdAt
        };
    }

    public async Task<List<PickupTimeDensityDto>> GetPickupTimeDensityAsync()
    {
        var today = DateTime.UtcNow.Date;

        var density = await _context.Orders
            .Where(o => o.CreatedAt >= today
                        && o.PickupTime != null
                        && o.Status != OrderStatus.Cancelled
                        && o.Status != OrderStatus.Paid
                        && o.Status != OrderStatus.NotPaid)
            .GroupBy(o => o.PickupTime!)
            .Select(g => new PickupTimeDensityDto
            {
                Time = g.Key,
                OrderCount = g.Count()
            })
            .ToListAsync();

        return density;
    }

    private static string GenerateOrderNumber()
    {
        // Kriptografik rastgele suffix — çakışma riski yok.
        // Örn: 20260318-143012-A3F2B1C4
        var utcNow = DateTime.UtcNow;
        var suffix = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(4));
        return $"{utcNow:yyyyMMdd-HHmmss}-{suffix}";
    }
}
