using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Models;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<VehicleModel> VehicleModels { get; set; }
    public DbSet<VehicleVariant> VehicleVariants { get; set; }
    public DbSet<VehicleColour> VehicleColours { get; set; }
    public DbSet<Vehicle> Vehicles { get; set; }
    public DbSet<Part> Parts { get; set; }
    public DbSet<ModelPart> ModelParts { get; set; }
    public DbSet<PartImage> PartImages { get; set; }
    public DbSet<Cart> Carts { get; set; }
    public DbSet<CartItem> CartItems { get; set; }
    public DbSet<Assembly> Assemblies { get; set; }
    public DbSet<AssemblyPart> AssemblyParts { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<PartColour> PartColours { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Vehicle>()
            .HasIndex(v => v.Vin)
            .IsUnique();

        modelBuilder.Entity<CartItem>()
            .HasIndex(ci => new { ci.CartId, ci.PartId })
            .IsUnique();

        modelBuilder.Entity<AssemblyPart>()
            .HasOne(ap => ap.Assembly)
            .WithMany(a => a.AssemblyParts)
            .HasForeignKey(ap => ap.AssemblyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AssemblyPart>()
            .HasOne(ap => ap.Part)
            .WithMany()
            .HasForeignKey(ap => ap.PartId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AssemblyPart>()
            .HasIndex(ap => new { ap.AssemblyId, ap.PartId })
            .IsUnique();

        modelBuilder.Entity<Order>()
            .Property(o => o.TotalAmount)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<OrderItem>()
            .Property(oi => oi.Price)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<OrderItem>()
            .Property(oi => oi.SubTotal)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Part>()
            .Property(p => p.Price)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Part>()
            .Property(p => p.Mrp)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Part>()
            .Property(p => p.Bdp)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Part>()
            .Property(p => p.TaxPercent)
            .HasColumnType("decimal(5,2)");

        // FIX RELATIONSHIPS
        modelBuilder.Entity<Part>()
            .HasOne<VehicleColour>()
            .WithMany(vc => vc.Parts)
            .HasForeignKey(p => p.ColourId);

        modelBuilder.Entity<Part>()
            .HasOne<VehicleVariant>()
            .WithMany(v => v.Parts)
            .HasForeignKey(p => p.VariantId);
    }
}