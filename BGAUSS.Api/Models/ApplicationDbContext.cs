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
    public DbSet<Category> Categories { get; set; }
    public DbSet<Part> Parts { get; set; }
    public DbSet<ModelPart> ModelParts { get; set; }
    public DbSet<PartImage> PartImages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Vehicle>()
            .HasIndex(v => v.VIN)
            .IsUnique();
    }
}