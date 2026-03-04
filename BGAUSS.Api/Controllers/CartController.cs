using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using BGAUSS.Api.DTOs;
using System.Text;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace BGAUSS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CartController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CartController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ================= ADD TO CART =================
        [HttpPost("add")]
        public async Task<IActionResult> AddToCart(AddToCartRequest request)
        {
            if (request.Quantity <= 0)
                return BadRequest("Quantity must be greater than 0");

            var part = await _context.Parts.FindAsync(request.PartId);
            if (part == null)
                return NotFound("Part not found");

            if (part.StockQuantity < request.Quantity)
                return BadRequest("Insufficient stock");

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .FirstOrDefaultAsync(c => c.UserId == request.UserId);

            if (cart == null)
            {
                cart = new Cart { UserId = request.UserId };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }

            var existingItem = cart.CartItems.FirstOrDefault(ci => ci.PartId == request.PartId);

            if (existingItem != null)
            {
                existingItem.Quantity += request.Quantity;
            }
            else
            {
                cart.CartItems.Add(new CartItem
                {
                    PartId = request.PartId,
                    Quantity = request.Quantity
                });
            }

            await _context.SaveChangesAsync();
            return Ok("Item added to cart");
        }

        // ================= GET CART =================
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetCart(int userId)
        {
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Part)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null)
                return Ok(new CartResponseDto());

            var items = cart.CartItems.Select(ci =>
            {
                decimal price = ci.Part?.Price ?? 0;

                return new CartItemDto
                {
                    CartItemId = ci.Id,
                    PartName = ci.Part?.PartName ?? "",
                    PartNumber = ci.Part?.PartNumber ?? "",
                    Price = price,
                    Quantity = ci.Quantity,
                    SubTotal = price * ci.Quantity
                };
            }).ToList();

            return Ok(new CartResponseDto
            {
                CartId = cart.Id,
                Items = items,
                TotalAmount = items.Sum(i => i.SubTotal)
            });
        }

        // ================= UPDATE SINGLE ITEM =================
        [HttpPut("update/{cartItemId}")]
        public async Task<IActionResult> UpdateQuantity(int cartItemId, int quantity)
        {
            var item = await _context.CartItems
                .Include(c => c.Part)
                .FirstOrDefaultAsync(x => x.Id == cartItemId);

            if (item == null)
                return NotFound();

            if (quantity <= 0)
            {
                _context.CartItems.Remove(item);
            }
            else
            {
                item.Quantity = quantity;
            }

            await _context.SaveChangesAsync();
            return Ok("Updated");
        }

        // ================= BULK UPDATE CART =================
        [HttpPut("update-cart")]
        public async Task<IActionResult> UpdateCart(UpdateCartRequest request)
        {
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Part)
                .FirstOrDefaultAsync(c => c.Id == request.CartId);

            if (cart == null) return NotFound();

            foreach (var item in request.Items!)
            {
                var cartItem = cart.CartItems.FirstOrDefault(x => x.Id == item.CartItemId);
                if (cartItem != null)
                {
                    if (item.Quantity <= 0)
                        _context.CartItems.Remove(cartItem);
                    else
                        cartItem.Quantity = item.Quantity;
                }
            }

            await _context.SaveChangesAsync();
            return Ok("Cart updated");
        }

        // ================= REMOVE ITEM =================
        [HttpDelete("{cartItemId}")]
        public async Task<IActionResult> RemoveItem(int cartItemId)
        {
            var item = await _context.CartItems
                .FirstOrDefaultAsync(x => x.Id == cartItemId);

            if (item == null)
                return NotFound();

            _context.CartItems.Remove(item);
            await _context.SaveChangesAsync();

            return Ok("Removed");
        }

        // ================= EMPTY CART =================
        [HttpDelete("empty/{userId}")]
        public async Task<IActionResult> EmptyCart(int userId)
        {
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null)
                return NotFound();

            _context.CartItems.RemoveRange(cart.CartItems);
            await _context.SaveChangesAsync();

            return Ok("Cart emptied");
        }

        // ================= CHECKOUT =================
        [HttpPost("checkout/{userId}")]
        public async Task<IActionResult> Checkout(int userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Part)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null || !cart.CartItems.Any())
                return BadRequest("Cart is empty");

            var order = new Order
            {
                UserId = userId,
                TotalAmount = 0
            };

            foreach (var item in cart.CartItems)
            {
                var part = item.Part;
                if (part == null)
                    return BadRequest("Part not found");

                if (part.StockQuantity < item.Quantity)
                    return BadRequest($"Insufficient stock for {part.PartName}");

                decimal price = part.Price ?? 0;
                decimal subTotal = price * item.Quantity;

                // Deduct stock **only at checkout**
                part.StockQuantity -= item.Quantity;

                order.OrderItems.Add(new OrderItem
                {
                    PartId = part.Id,
                    Quantity = item.Quantity,
                    Price = price,
                    SubTotal = subTotal
                });

                order.TotalAmount += subTotal;
            }

            _context.Orders.Add(order);
            _context.CartItems.RemoveRange(cart.CartItems);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                Message = "Order placed successfully",
                OrderId = order.Id,
                Total = order.TotalAmount
            });
        }

        // ================= DOWNLOAD CSV =================
        [HttpGet("download/csv/{userId}")]
        public async Task<IActionResult> DownloadCsv(int userId)
        {
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Part)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null)
                return NotFound();

            var sb = new StringBuilder();
            sb.AppendLine("PartName,PartNumber,Price,Quantity,SubTotal");

            foreach (var item in cart.CartItems)
            {
                decimal price = item.Part?.Price ?? 0;
                sb.AppendLine($"{item.Part?.PartName},{item.Part?.PartNumber},{price},{item.Quantity},{price * item.Quantity}");
            }

            var fileName = $"Cart_{userId}_{DateTime.Now:yyyyMMddHHmmss}.csv";
            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "downloads");
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            var filePath = Path.Combine(folderPath, fileName);
            await System.IO.File.WriteAllTextAsync(filePath, sb.ToString());

            var relativePath = $"/downloads/{fileName}";
            return Ok(new { Message = "CSV generated", Path = relativePath });
        }

        // ================= DOWNLOAD PDF =================
        [HttpGet("download/pdf/{userId}")]
        public async Task<IActionResult> DownloadPdf(int userId)
        {
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Part)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null)
                return NotFound();

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Content().Column(col =>
                    {
                        col.Item().Text("Cart Summary").FontSize(20);

                        foreach (var item in cart.CartItems)
                        {
                            decimal price = item.Part?.Price ?? 0;
                            col.Item().Text($"{item.Part?.PartName} - Qty: {item.Quantity} - ₹{price * item.Quantity}");
                        }
                    });
                });
            });

            var fileName = $"Cart_{userId}_{DateTime.Now:yyyyMMddHHmmss}.pdf";
            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "downloads");
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            var filePath = Path.Combine(folderPath, fileName);
            await System.IO.File.WriteAllBytesAsync(filePath, document.GeneratePdf());

            var relativePath = $"/downloads/{fileName}";
            return Ok(new { Message = "PDF generated", Path = relativePath });
        }
    }
}