using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGAUSS.Api.Models;
using BGAUSS.Api.DTOs;

namespace BGAUSS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CartController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CartController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ADD TO CART
    [HttpPost("add")]
    public async Task<IActionResult> AddToCart(AddToCartRequest request)
    {
        if (request.Quantity <= 0)
            return BadRequest("Quantity must be greater than 0");

        var cart = await _context.Carts
            .Include(c => c.CartItems)
            .FirstOrDefaultAsync(c => c.UserId == request.UserId);

        if (cart == null)
        {
            cart = new Cart
            {
                UserId = request.UserId,
                CartItems = new List<CartItem>()
            };

            _context.Carts.Add(cart);
            await _context.SaveChangesAsync();
        }

        var existingItem = cart.CartItems?
            .FirstOrDefault(ci => ci.PartId == request.PartId);

        if (existingItem != null)
        {
            existingItem.Quantity += request.Quantity;
        }
        else
        {
            cart.CartItems?.Add(new CartItem
            {
                PartId = request.PartId,
                Quantity = request.Quantity
            });
        }

        await _context.SaveChangesAsync();

        return Ok("Item added to cart");
    }

    // GET CART
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetCart(int userId)
    {
        var cart = await _context.Carts
            .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Part)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart == null)
            return Ok(new CartResponseDto());

        var response = new CartResponseDto
        {
            CartId = cart.Id,
            Items = cart.CartItems?.Select(ci => new CartItemDto
            {
                CartItemId = ci.Id,
                PartName = ci.Part!.PartName,
                PartNumber = ci.Part.PartNumber,
                Price = ci.Part.Price,
                Quantity = ci.Quantity,
                SubTotal = ci.Quantity * ci.Part.Price
            }).ToList(),
            TotalAmount = cart.CartItems!
                .Sum(ci => ci.Quantity * ci.Part!.Price)
        };

        return Ok(response);
    }

    // UPDATE QUANTITY
    [HttpPut("update/{cartItemId}")]
    public async Task<IActionResult> UpdateQuantity(int cartItemId, int quantity)
    {
        var item = await _context.CartItems.FindAsync(cartItemId);
        if (item == null) return NotFound();

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

    // REMOVE ITEM
    [HttpDelete("{cartItemId}")]
    public async Task<IActionResult> RemoveItem(int cartItemId)
    {
        var item = await _context.CartItems.FindAsync(cartItemId);
        if (item == null) return NotFound();

        _context.CartItems.Remove(item);
        await _context.SaveChangesAsync();

        return Ok("Removed");
    }
}