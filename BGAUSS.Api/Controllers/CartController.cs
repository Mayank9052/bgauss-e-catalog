using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using BGAUSS.Api.DTOs;
using System.Security.Claims;
using System.Text;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using QuestPDF.Helpers;

namespace BGAUSS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CartController(ApplicationDbContext context)
        {
            _context = context;
        }

        // // 🔐 Get logged-in user from JWT
        // private int GetUserId()
        // {
        //     return int.Parse(User.FindFirst("UserId")!.Value);

            
        // }

        private int GetUserId()
        {
            var claim = User.FindFirst("UserId")??
                        User.FindFirst(ClaimTypes.NameIdentifier) ??
                        User.FindFirst("sub");

            if (claim == null)
                throw new UnauthorizedAccessException("UserId claim missing in token");

            return int.Parse(claim.Value);
        }

        // ================= ADD TO CART =================
        [HttpPost("add")]
        public async Task<IActionResult> AddToCart(AddToCartRequest request)
        {
            int userId = GetUserId();

            if (request.Quantity <= 0)
                return BadRequest("Quantity must be greater than 0");

            var part = await _context.Parts.FindAsync(request.PartId);
            
            if (part == null)
                return NotFound("Part not found");

            if (part.StockQuantity < request.Quantity)
                return BadRequest("Insufficient stock");

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null)
            {
                cart = new Cart { UserId = userId };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }

            var existingItem = cart.CartItems.FirstOrDefault(ci => ci.PartId == request.PartId);

            if (existingItem != null)
                existingItem.Quantity += request.Quantity;
            else
                cart.CartItems.Add(new CartItem
                {
                    PartId = request.PartId,
                    Quantity = request.Quantity
                });

            await _context.SaveChangesAsync();
            return Ok("Item added to cart");
        }

        // ================= GET MY CART =================
        [HttpGet("my-cart")]
        public async Task<IActionResult> GetMyCart()
        {
            int userId = GetUserId();

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Part)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null || !cart.CartItems.Any())
                return Ok(new {  items = new List<object>() });

            var items = cart.CartItems.Select(ci => new
            {
                ci.Id,
                PartName = ci.Part!.PartName,
                PartNumber = ci.Part.PartNumber,
                //ImagePath = ci.Part.PartImages,
                Price = ci.Part.Price,
                ci.Quantity,
                SubTotal = ci.Quantity * (ci.Part.Price ?? 0),
                StockQuantity = ci.Part.StockQuantity
            }).ToList();

            return Ok(new
            {
                // cart.Id,
                // Items = items,
                // Total = items.Sum(i => i.SubTotal)

                items,
                total = items.Sum(i => i.SubTotal)
            });
        }

        // ================= UPDATE SINGLE ITEM =================
        [HttpPut("update/{cartItemId}")]
        public async Task<IActionResult> UpdateQuantity(int cartItemId, int quantity)
        {
            int userId = GetUserId();

            var item = await _context.CartItems
                .Include(c => c.Part)
                .Include(c => c.Cart)
                .FirstOrDefaultAsync(x => x.Id == cartItemId);

            if (item == null || item.Cart == null || item.Cart.UserId != userId)
                return NotFound();

            if (quantity <= 0)
            {
                _context.CartItems.Remove(item);
            }
            else
            {
                if (item.Part == null)
                    return BadRequest("Part not found");

                if (quantity > item.Part.StockQuantity)
                    return BadRequest($"Only {item.Part.StockQuantity} items available for {item.Part.PartName}");

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
        [HttpDelete("remove/{cartItemId}")]
        public async Task<IActionResult> RemoveItem(int cartItemId)
        {
            var item = await _context.CartItems
                .FirstOrDefaultAsync(x => x.Id == cartItemId);

            if (item == null)
                return NotFound();

            _context.CartItems.Remove(item);
            await _context.SaveChangesAsync();

            return Ok("Item removed");
        }

        // ================= EMPTY CART =================
        [HttpDelete("empty")]
        public async Task<IActionResult> EmptyCart()
        {
            int userId = GetUserId();

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
        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout()
        {
            int userId = GetUserId();

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
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

                var orderSummaryItems = new List<object>();

                foreach (var item in cart.CartItems)
                {
                    var part = item.Part!;
                    if (part.StockQuantity < item.Quantity)
                        throw new InvalidOperationException($"Insufficient stock for {part.PartName}");

                    decimal price = part.Price ?? 0;
                    decimal subTotal = price * item.Quantity;

                    // Deduct stock
                    part.StockQuantity -= item.Quantity;

                    order.OrderItems.Add(new OrderItem
                    {
                        PartId = part.Id,
                        Quantity = item.Quantity,
                        Price = price,
                        SubTotal = subTotal
                    });

                    orderSummaryItems.Add(new
                    {
                        item.Id,
                        PartName = part.PartName,
                        PartNumber = part.PartNumber,
                        Price = price,
                        item.Quantity,
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
                    Total = order.TotalAmount,
                    TotalAmount = order.TotalAmount,
                    Items = orderSummaryItems
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { Message = "Checkout failed", Details = ex.Message });
            }
        }

        // ================= DOWNLOAD CSV =================
        [HttpGet("download/csv")]
        public async Task<IActionResult> DownloadCsv()
        {
            int userId = GetUserId();
        
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Part)
                .FirstOrDefaultAsync(c => c.UserId == userId);
        
            if (cart == null || !cart.CartItems.Any())
                return NotFound("Cart empty");
        
            var sb = new StringBuilder();
        
            sb.AppendLine("Product Name,Part Number,Price,Quantity,Subtotal");
        
            decimal total = 0;
        
            foreach (var item in cart.CartItems)
            {
                decimal price = item.Part?.Price ?? 0;
                decimal subtotal = price * item.Quantity;
        
                total += subtotal;
        
                sb.AppendLine($"{item.Part?.PartName},{item.Part?.PartNumber},{price},{item.Quantity},{subtotal}");
            }
        
            // Add empty line
            sb.AppendLine("");
        
            // Add total row
            sb.AppendLine($",,,,Total Sum,{total}");
        
            var fileName = $"Cart_{userId}_{DateTime.Now:yyyyMMddHHmmss}.csv";
        
            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "downloads");
        
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);
        
            var filePath = Path.Combine(folderPath, fileName);
        
            await System.IO.File.WriteAllTextAsync(filePath, sb.ToString());
        
            return Ok(new
            {
                path = $"/downloads/{fileName}"
            });
        }

        // ================= DOWNLOAD PDF =================
        [HttpGet("download/pdf")]
        public async Task<IActionResult> DownloadPdf()
        {
            int userId = GetUserId();

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Part)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null || !cart.CartItems.Any())
                return NotFound("Cart is empty");

            var items = cart.CartItems.Select(ci => new
            {
                ProductName = ci.Part!.PartName,
                PartNumber = ci.Part.PartNumber,
                Price = ci.Part.Price ?? 0,
                Quantity = ci.Quantity,
                SubTotal = (ci.Part.Price ?? 0) * ci.Quantity
            }).ToList();

            decimal total = items.Sum(x => x.SubTotal);

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(30);

                    /* ================= HEADER ================= */

                    page.Header().Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("BGAUSS")
                                .FontSize(24)
                                .Bold();

                            col.Item().Text("Electronic Parts Catalog")
                                .FontSize(14);
                        });

                        row.ConstantItem(200).AlignRight().Column(col =>
                        {
                            col.Item().Text($"Date: {DateTime.Now:dd MMM yyyy}");
                            col.Item().Text($"User ID: {userId}");
                        });
                    });

                    /* ================= TITLE ================= */

                    page.Content().Column(col =>
                    {
                        col.Item().PaddingVertical(15).Text("Cart Items")
                            .FontSize(20)
                            .Bold()
                            .AlignCenter();

                        /* ================= TABLE ================= */

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(1);
                                columns.RelativeColumn(1);
                                columns.RelativeColumn(1);
                            });

                            /* TABLE HEADER */

                            table.Header(header =>
                            {
                                header.Cell().Border(1).Padding(5).Text("Product").Bold();
                                header.Cell().Border(1).Padding(5).Text("Part Number").Bold();
                                header.Cell().Border(1).Padding(5).AlignRight().Text("Price").Bold();
                                header.Cell().Border(1).Padding(5).AlignCenter().Text("Qty").Bold();
                                header.Cell().Border(1).Padding(5).AlignRight().Text("Subtotal").Bold();
                            });

                            /* TABLE ROWS */

                            foreach (var item in items)
                            {
                                table.Cell().Border(1).Padding(5).Text(item.ProductName);

                                table.Cell().Border(1).Padding(5).Text(item.PartNumber);

                                table.Cell().Border(1).Padding(5)
                                    .AlignRight()
                                    .Text($"₹ {item.Price}");

                                table.Cell().Border(1).Padding(5)
                                    .AlignCenter()
                                    .Text(item.Quantity.ToString());

                                table.Cell().Border(1).Padding(5)
                                    .AlignRight()
                                    .Text($"₹ {item.SubTotal}");
                            }
                        });

                        /* ================= TOTAL ================= */

                        col.Item().AlignRight().PaddingTop(10).Text($"Total: ₹ {total}")
                            .FontSize(16)
                            .Bold();
                    });

                    /* ================= FOOTER ================= */

                    page.Footer()
                        .AlignCenter()
                        .Text("Generated from BGAUSS Electronic Parts Catalog")
                        .FontSize(10);
                });
            });

            var fileName = $"Cart_{userId}_{DateTime.Now:yyyyMMddHHmmss}.pdf";

            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "downloads");

            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            var filePath = Path.Combine(folderPath, fileName);

            await System.IO.File.WriteAllBytesAsync(filePath, document.GeneratePdf());

            return Ok(new
            {
                path = $"/downloads/{fileName}"
            });
        }
    }
}
