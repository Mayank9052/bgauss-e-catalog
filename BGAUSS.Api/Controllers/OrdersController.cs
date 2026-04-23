// Controllers/OrdersController.cs
// GET /api/orders/my   → returns the current JWT user's orders with items
// POST /api/orders/{orderId}/items/{itemId}/cancel → cancels a single order item

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using System.Security.Claims;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public OrdersController(ApplicationDbContext context) => _context = context;

    private int GetUserId()
    {
        var claim = User.FindFirst("UserId")
                 ?? User.FindFirst(ClaimTypes.NameIdentifier)
                 ?? User.FindFirst("sub");

        if (claim == null)
            throw new UnauthorizedAccessException("UserId claim missing in token");

        return int.Parse(claim.Value);
    }

    // ── GET /api/orders/my ────────────────────────────────────────────────────
    [HttpGet("my")]
    public async Task<IActionResult> GetMyOrders()
    {
        int userId = GetUserId();

        var orders = await _context.Orders
            .Where(o => o.UserId == userId)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Part)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id,
                o.TotalAmount,
                o.Status,
                CreatedAt = o.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
                Items = o.OrderItems.Select(oi => new
                {
                    Id         = oi.Id,
                    PartId     = oi.PartId,
                    PartName   = oi.Part != null ? oi.Part.PartName   : "—",
                    PartNumber = oi.Part != null ? oi.Part.PartNumber : "—",
                    oi.Price,
                    oi.Quantity,
                    oi.SubTotal,
                }).ToList(),
            })
            .ToListAsync();

        return Ok(orders);
    }

    // ── POST /api/orders/{orderId}/items/{itemId}/cancel ──────────────────────
    [HttpPost("{orderId:int}/items/{itemId:int}/cancel")]
    public async Task<IActionResult> CancelItem(int orderId, int itemId)
    {
        int userId = GetUserId();

        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

        if (order == null)
            return NotFound(new { message = "Order not found." });

        if (order.Status?.ToLower() == "delivered")
            return BadRequest(new { message = "Delivered orders cannot be cancelled." });

        var item = order.OrderItems.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
            return NotFound(new { message = "Order item not found." });

        // Restore stock
        var part = await _context.Parts.FindAsync(item.PartId);
        if (part != null)
            part.StockQuantity += item.Quantity;

        // Remove the item
        _context.OrderItems.Remove(item);

        // Recalculate order total
        order.TotalAmount = order.OrderItems
            .Where(i => i.Id != itemId)
            .Sum(i => i.SubTotal);

        // If no items left, cancel the whole order
        if (!order.OrderItems.Any(i => i.Id != itemId))
            order.Status = "Cancelled";

        await _context.SaveChangesAsync();

        return Ok(new { message = "Item cancelled successfully.", orderId, itemId });
    }
}