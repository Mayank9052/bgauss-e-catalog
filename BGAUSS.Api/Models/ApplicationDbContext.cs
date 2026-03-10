using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace BGAUSS.Api.Models;

public partial class ApplicationDbContext : DbContext
{
    public ApplicationDbContext()
    {
    }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Assembly> Assemblies { get; set; }

    public virtual DbSet<AssemblyPart> AssemblyParts { get; set; }

    public virtual DbSet<Cart> Carts { get; set; }

    public virtual DbSet<CartItem> CartItems { get; set; }

    public virtual DbSet<ModelPart> ModelParts { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderItem> OrderItems { get; set; }

    public virtual DbSet<Part> Parts { get; set; }

    public virtual DbSet<PartColour> PartColours { get; set; }

    public virtual DbSet<PartImage> PartImages { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Vehicle> Vehicles { get; set; }

    public virtual DbSet<VehicleColour> VehicleColours { get; set; }

    public virtual DbSet<VehicleModel> VehicleModels { get; set; }

    public virtual DbSet<VehicleVariant> VehicleVariants { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=192.168.68.57,1433;Database=EpcDB;User Id=userepc;Password=Epcuser@123;TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("db_owner");

        modelBuilder.Entity<Assembly>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Assembli__3214EC071AD246DD");

            entity.Property(e => e.AssemblyName).HasMaxLength(200);
            entity.Property(e => e.ImagePath).HasMaxLength(500);

            entity.HasOne(d => d.Model).WithMany(p => p.Assemblies)
                .HasForeignKey(d => d.ModelId)
                .HasConstraintName("FK_Assemblies_Model");
        });

        modelBuilder.Entity<AssemblyPart>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Assembly__3214EC07D9D45470");

            entity.Property(e => e.Erp)
                .HasMaxLength(100)
                .HasColumnName("ERP");
            entity.Property(e => e.Frt)
                .HasMaxLength(50)
                .HasColumnName("FRT");
            entity.Property(e => e.Remark).HasMaxLength(500);

            entity.HasOne(d => d.Assembly).WithMany(p => p.AssemblyParts)
                .HasForeignKey(d => d.AssemblyId)
                .HasConstraintName("FK__AssemblyP__Assem__05D8E0BE");

            entity.HasOne(d => d.Part).WithMany(p => p.AssemblyParts)
                .HasForeignKey(d => d.PartId)
                .HasConstraintName("FK__AssemblyP__PartI__06CD04F7");
        });

        modelBuilder.Entity<Cart>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Carts__3214EC07A0CBBF40");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getutcdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.User).WithMany(p => p.Carts)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Carts__UserId__7B5B524B");
        });

        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__CartItem__3214EC07D492E4DC");

            entity.HasIndex(e => new { e.CartId, e.PartId }, "IX_CartItem_Unique").IsUnique();

            entity.Property(e => e.AddedAt)
                .HasDefaultValueSql("(getutcdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Cart).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.CartId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CartItems__CartI__00200768");

            entity.HasOne(d => d.Part).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.PartId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CartItems__PartI__01142BA1");
        });

        modelBuilder.Entity<ModelPart>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ModelPar__3214EC071E66AC5A");

            entity.HasOne(d => d.Model).WithMany(p => p.ModelParts)
                .HasForeignKey(d => d.ModelId)
                .HasConstraintName("FK__ModelPart__Model__6477ECF3");

            entity.HasOne(d => d.Part).WithMany(p => p.ModelParts)
                .HasForeignKey(d => d.PartId)
                .HasConstraintName("FK__ModelPart__PartI__66603565");

            entity.HasOne(d => d.Variant).WithMany(p => p.ModelParts)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("FK__ModelPart__Varia__656C112C");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasIndex(e => e.UserId, "IX_Orders_UserId");

            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.User).WithMany(p => p.Orders).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasIndex(e => e.OrderId, "IX_OrderItems_OrderId");

            entity.HasIndex(e => e.PartId, "IX_OrderItems_PartId");

            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SubTotal).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Order).WithMany(p => p.OrderItems).HasForeignKey(d => d.OrderId);

            entity.HasOne(d => d.Part).WithMany(p => p.OrderItems).HasForeignKey(d => d.PartId);
        });

        modelBuilder.Entity<Part>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Parts__3214EC07953498D7");

            entity.Property(e => e.Bdp)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("BDP");
            entity.Property(e => e.Mrp)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("MRP");
            entity.Property(e => e.PartName).HasMaxLength(200);
            entity.Property(e => e.PartNumber).HasMaxLength(100);
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TaxPercent).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.TorqueNm).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.Assembly).WithMany(p => p.Parts)
                .HasForeignKey(d => d.AssemblyId)
                .HasConstraintName("FK_Parts_Assembly");

            entity.HasOne(d => d.Colour).WithMany(p => p.Parts)
                .HasForeignKey(d => d.ColourId)
                .HasConstraintName("FK_Parts_Colour");

            entity.HasOne(d => d.Variant).WithMany(p => p.Parts)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("FK_Parts_Variant");
        });

        modelBuilder.Entity<PartColour>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__PartColo__3214EC07FD323B66");

            entity.HasOne(d => d.Colour).WithMany(p => p.PartColours)
                .HasForeignKey(d => d.ColourId)
                .HasConstraintName("FK_PartColours_VehicleColours");

            entity.HasOne(d => d.Part).WithMany(p => p.PartColours)
                .HasForeignKey(d => d.PartId)
                .HasConstraintName("FK_PartColours_Parts");
        });

        modelBuilder.Entity<PartImage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__PartImag__3214EC07E7DB4E9E");

            entity.Property(e => e.ImagePath).HasMaxLength(500);

            entity.HasOne(d => d.Part).WithMany(p => p.PartImages)
                .HasForeignKey(d => d.PartId)
                .HasConstraintName("FK__PartImage__PartI__693CA210");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.Property(e => e.Username).HasMaxLength(100);
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Vehicles__3214EC073BB36037");

            entity.HasIndex(e => e.Vin, "UQ__Vehicles__C5DF234CFF3CF818").IsUnique();

            entity.Property(e => e.Vin)
                .HasMaxLength(17)
                .HasColumnName("VIN");

            entity.HasOne(d => d.Colour).WithMany(p => p.Vehicles)
                .HasForeignKey(d => d.ColourId)
                .HasConstraintName("FK__Vehicles__Colour__5CD6CB2B");

            entity.HasOne(d => d.Model).WithMany(p => p.Vehicles)
                .HasForeignKey(d => d.ModelId)
                .HasConstraintName("FK__Vehicles__ModelI__5AEE82B9");

            entity.HasOne(d => d.Variant).WithMany(p => p.Vehicles)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("FK__Vehicles__Varian__5BE2A6F2");
        });

        modelBuilder.Entity<VehicleColour>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__VehicleC__3214EC074CADA9B6");

            entity.Property(e => e.ColourName).HasMaxLength(50);
            entity.Property(e => e.ImagePath).HasMaxLength(500);

            entity.HasOne(d => d.Model).WithMany(p => p.VehicleColours)
                .HasForeignKey(d => d.ModelId)
                .HasConstraintName("FK_Colour_Model");

            entity.HasOne(d => d.Variant).WithMany(p => p.VehicleColours)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("FK_Colour_Variant");
        });

        modelBuilder.Entity<VehicleModel>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__VehicleM__3214EC07368365C6");

            entity.Property(e => e.ModelName).HasMaxLength(100);
        });

        modelBuilder.Entity<VehicleVariant>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__VehicleV__3214EC0703D99E67");

            entity.Property(e => e.VariantName).HasMaxLength(100);

            entity.HasOne(d => d.Model).WithMany(p => p.VehicleVariants)
                .HasForeignKey(d => d.ModelId)
                .HasConstraintName("FK__VehicleVa__Model__5535A963");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
