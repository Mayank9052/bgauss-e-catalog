using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using BGAUSS.Api.DTOs;
using BGAUSS.Api.Services;
using BGAUSS.Api.Settings;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using QuestPDF.Helpers;

namespace BGAUSS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    //[Authorize]
    public class CartController : ControllerBase
    {
        private readonly ApplicationDbContext    _context;
        private readonly IEmailService           _email;
        private readonly SmtpSettings            _smtp;
        private readonly ILogger<CartController> _logger;
        // ✅ Used to create a fresh DbContext scope inside Task.Run
        //    (the request-scoped _context is disposed when the HTTP response
        //    is sent, so any async background work MUST use its own scope)
        private readonly IServiceScopeFactory    _scopeFactory;

        public CartController(
            ApplicationDbContext     context,
            IEmailService            email,
            IOptions<SmtpSettings>   smtp,
            ILogger<CartController>  logger,
            IServiceScopeFactory     scopeFactory)
        {
            _context      = context;
            _email        = email;
            _smtp         = smtp.Value;
            _logger       = logger;
            _scopeFactory = scopeFactory;
        }

        // ── SAFE STRING → INT ────────────────────────────────────────────────
        private int ToInt(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return 0;
            return int.TryParse(value, out var result) ? result : 0;
        }

        // ── SAFE STRING → DECIMAL (supports "0.003" kg values) ──────────────
        private decimal ToDecimal(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return 0;
            return decimal.TryParse(value, out var result) ? result : 0;
        }

        // ── GET USER ID FROM JWT ─────────────────────────────────────────────
        private int GetUserId()
        {
            var claim = User.FindFirst("UserId")
                     ?? User.FindFirst(ClaimTypes.NameIdentifier)
                     ?? User.FindFirst("sub");

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

            int stockQty = ToInt(part.StockQuantity);

            if (stockQty < request.Quantity)
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
            {
                int existingQty = ToInt(existingItem.Quantity);
                int nextQty     = existingQty + request.Quantity;

                if (nextQty > stockQty)
                    return BadRequest($"Only {stockQty - existingQty} available");

                existingItem.Quantity = nextQty.ToString();
            }
            else
            {
                cart.CartItems.Add(new CartItem
                {
                    PartId   = request.PartId,
                    Quantity = request.Quantity.ToString()
                });
            }

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
                return Ok(new { items = new List<object>() });

            var items = cart.CartItems.Select(ci =>
            {
                decimal qty   = ToDecimal(ci.Quantity);
                decimal price = ci.Part?.Price ?? 0;

                return new
                {
                    ci.Id,
                    ci.PartId,
                    PartName      = ci.Part!.PartName,
                    PartNumber    = ci.Part.PartNumber,
                    Price         = price,
                    Quantity      = qty,
                    SubTotal      = qty * price,
                    StockQuantity = ci.Part.StockQuantity
                };
            }).ToList();

            return Ok(new
            {
                items,
                total = items.Sum(i => i.SubTotal)
            });
        }

        // ================= UPDATE ITEM =================
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
                int stockQty = ToInt(item.Part!.StockQuantity);

                if (quantity > stockQty)
                    return BadRequest($"Only {stockQty} available");

                item.Quantity = quantity.ToString();
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
                        cartItem.Quantity = item.Quantity.ToString();
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

        // ================= CHECKOUT (with email) =================
        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout()
        {
            int userId = GetUserId();

            // ── 1. Load cart ─────────────────────────────────────────────────
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Part)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null || !cart.CartItems.Any())
                return BadRequest(new { Message = "Your cart is empty." });

            // ── 2. Fetch user BEFORE SaveChanges (same request scope is safe) ─
            var dbUser = await _context.Users.FindAsync(userId);

            // ✅ Email resolution priority:
            //    1. User.Email column (explicitly stored email address)
            //    2. User.Username   (for BGAUSS, Username IS the email address)
            string userEmail = !string.IsNullOrWhiteSpace(dbUser?.Email)
                ? dbUser.Email
                : dbUser?.Username ?? "unknown@bgauss.com";
            string userName  = dbUser?.Username ?? $"User #{userId}";

            // ── 3. Build order ───────────────────────────────────────────────
            var order = new Order
            {
                UserId      = userId,
                Status      = "Pending",
                TotalAmount = 0,
                CreatedAt   = DateTime.UtcNow,
                OrderItems  = new List<OrderItem>()
            };

            decimal total          = 0;
            var orderItemsForEmail = new List<(string PartNumber, string PartName, int Qty, decimal SubTotal)>();

            foreach (var ci in cart.CartItems)
            {
                if (ci.Part == null) continue;

                var part     = ci.Part;
                int qty      = ToInt(ci.Quantity);
                int stockQty = ToInt(part.StockQuantity);

                if (stockQty < qty)
                    return BadRequest($"Insufficient stock for {part.PartName}");

                decimal price    = part.Price ?? 0;
                decimal subTotal = price * qty;
                total += subTotal;

                order.OrderItems.Add(new OrderItem
                {
                    PartId   = ci.PartId,
                    Quantity = qty,
                    Price    = price,
                    SubTotal = subTotal,
                });

                orderItemsForEmail.Add((
                    part.PartNumber ?? "—",
                    part.PartName   ?? "—",
                    qty,
                    subTotal));

                part.StockQuantity = Math.Max(0, stockQty - qty).ToString();
            }

            order.TotalAmount = total;

            _context.Orders.Add(order);
            _context.CartItems.RemoveRange(cart.CartItems);
            await _context.SaveChangesAsync();

            // ── 4. Snapshot everything the background task needs ─────────────
            //    Plain value types only — no EF entity references.
            //    The request-scoped _context will be disposed before Task.Run runs.
            int      savedOrderId = order.Id;
            decimal  savedTotal   = order.TotalAmount;
            string   savedStatus  = order.Status;
            DateTime savedPlacedAt = order.CreatedAt;
            var      emailItems   = orderItemsForEmail.ToList(); // defensive copy
            string   toEmail      = _smtp.AdminEmail1;
            string   ccEmail      = _smtp.AdminEmail2;
            // Capture SMTP settings by value so the singleton isn't an issue
            string   capturedUserEmail = userEmail;
            string   capturedUserName  = userName;

            // ── 5. Fire-and-forget — uses only captured value-type data ───────
            //    No DbContext, no scoped services accessed here.
            //    IEmailService is registered as Singleton so it is safe to capture.
            _ = Task.Run(async () =>
            {
                try
                {
                    var htmlBody = EmailTemplates.OrderConfirmation(
                        userEmail:   capturedUserEmail,
                        username:    capturedUserName,
                        orderId:     savedOrderId,
                        totalAmount: savedTotal,
                        placedAt:    savedPlacedAt,
                        items:       emailItems);

                    await _email.SendAsync(
                        toEmail:      toEmail,
                        ccEmail:      ccEmail,
                        subject:      $"[BGAUSS Order] New Order #{savedOrderId} — ₹{savedTotal:N2}",
                        htmlBody:     htmlBody,
                        replyToEmail: capturedUserEmail);   // Reply-To = user's email

                    _logger.LogInformation(
                        "Order #{OrderId} confirmation sent → To:{Admin1} CC:{Admin2}",
                        savedOrderId, toEmail, ccEmail);
                }
                catch (Exception ex)
                {
                    // Email failure must NEVER affect the already-saved order
                    _logger.LogError(ex,
                        "Order #{OrderId} — confirmation email failed", savedOrderId);
                }
            });

            // ── 6. Respond immediately — don't wait for email ────────────────
            return Ok(new
            {
                orderId     = savedOrderId,
                totalAmount = savedTotal,
                status      = savedStatus,
                message     = "Order placed successfully.",
                items       = emailItems.Select(i => new
                {
                    partNumber = i.PartNumber,
                    partName   = i.PartName,
                    quantity   = i.Qty,
                    subTotal   = i.SubTotal,
                }),
            });
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
                decimal price    = item.Part?.Price ?? 0;
                int     qty      = ToInt(item.Quantity);
                decimal subtotal = price * qty;
                total += subtotal;

                sb.AppendLine($"{item.Part?.PartName},{item.Part?.PartNumber},{price},{item.Quantity},{subtotal}");
            }

            sb.AppendLine("");
            sb.AppendLine($",,,,Total Sum,{total}");

            var fileName   = $"Cart_{userId}_{DateTime.Now:yyyyMMddHHmmss}.csv";
            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "downloads");

            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            await System.IO.File.WriteAllTextAsync(Path.Combine(folderPath, fileName), sb.ToString());

            return Ok(new { path = $"/downloads/{fileName}" });
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

            var items = cart.CartItems.Select(ci =>
            {
                int     qty   = ToInt(ci.Quantity);
                decimal price = ci.Part!.Price ?? 0;
                return new
                {
                    ProductName = ci.Part.PartName,
                    PartNumber  = ci.Part.PartNumber?.Trim() ?? "",
                    Price       = price,
                    Quantity    = qty,
                    SubTotal    = price * qty
                };
            }).ToList();

            decimal total = items.Sum(x => x.SubTotal);

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(30);

                    page.Header().Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("BGAUSS").FontSize(24).Bold();
                            col.Item().Text("Electronic Parts Catalog").FontSize(14);
                        });

                        row.ConstantItem(200).AlignRight().Column(col =>
                        {
                            col.Item().Text($"Date: {DateTime.Now:dd MMM yyyy}");
                            col.Item().Text($"User ID: {userId}");
                        });
                    });

                    page.Content().Column(col =>
                    {
                        col.Item().PaddingVertical(15)
                            .Text("Cart Items").FontSize(20).Bold().AlignCenter();

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

                            table.Header(header =>
                            {
                                header.Cell().Border(1).Padding(5).Text("Product").Bold();
                                header.Cell().Border(1).Padding(5).Text("Part Number").Bold();
                                header.Cell().Border(1).Padding(5).AlignRight().Text("Price").Bold();
                                header.Cell().Border(1).Padding(5).AlignCenter().Text("Qty").Bold();
                                header.Cell().Border(1).Padding(5).AlignRight().Text("Subtotal").Bold();
                            });

                            foreach (var item in items)
                            {
                                table.Cell().Border(1).Padding(5).Text(item.ProductName);
                                table.Cell().Border(1).Padding(5).Text(item.PartNumber);
                                table.Cell().Border(1).Padding(5).AlignRight().Text($"₹ {item.Price}");
                                table.Cell().Border(1).Padding(5).AlignCenter().Text(item.Quantity.ToString());
                                table.Cell().Border(1).Padding(5).AlignRight().Text($"₹ {item.SubTotal}");
                            }
                        });

                        col.Item().AlignRight().PaddingTop(10)
                            .Text($"Total: ₹ {total}").FontSize(16).Bold();
                    });

                    page.Footer()
                        .AlignCenter()
                        .Text("Generated from BGAUSS Electronic Parts Catalog")
                        .FontSize(10);
                });
            });

            var fileName   = $"Cart_{userId}_{DateTime.Now:yyyyMMddHHmmss}.pdf";
            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "downloads");

            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            await System.IO.File.WriteAllBytesAsync(
                Path.Combine(folderPath, fileName),
                document.GeneratePdf());

            return Ok(new { path = $"/downloads/{fileName}" });
        }
    }
}