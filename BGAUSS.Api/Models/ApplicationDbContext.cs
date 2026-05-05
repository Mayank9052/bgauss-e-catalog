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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("dbo");

        modelBuilder.Entity<Assembly>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Assembli__3214EC07BFD3C3CB");

            entity.HasOne(d => d.Model).WithMany(p => p.Assemblies).HasConstraintName("FK_Assemblies_Model");

            entity.HasOne(d => d.Variant).WithMany(p => p.Assemblies)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_Assemblies_VehicleVariants");
        });

        modelBuilder.Entity<AssemblyPart>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Assembly__3214EC07EE39D7C2");

            entity.HasOne(d => d.Assembly).WithMany(p => p.AssemblyParts).HasConstraintName("FK__AssemblyP__Assem__5812160E");

            entity.HasOne(d => d.Part).WithMany(p => p.AssemblyParts).HasConstraintName("FK__AssemblyP__PartI__59063A47");
        });

        modelBuilder.Entity<Cart>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Carts__3214EC0799B862BD");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.User).WithMany(p => p.Carts)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Carts__UserId__5BE2A6F2");
        });

        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__CartItem__3214EC07E6D943E3");

            entity.Property(e => e.AddedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.Cart).WithMany(p => p.CartItems)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CartItems__CartI__59FA5E80");

            entity.HasOne(d => d.Part).WithMany(p => p.CartItems)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CartItems__PartI__5AEE82B9");
        });

        modelBuilder.Entity<ModelPart>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ModelPar__3214EC07FD418A17");

            entity.HasOne(d => d.Model).WithMany(p => p.ModelParts).HasConstraintName("FK__ModelPart__Model__5CD6CB2B");

            entity.HasOne(d => d.Part).WithMany(p => p.ModelParts).HasConstraintName("FK__ModelPart__PartI__5DCAEF64");

            entity.HasOne(d => d.Variant).WithMany(p => p.ModelParts).HasConstraintName("FK__ModelPart__Varia__5EBF139D");
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
            entity.HasKey(e => e.Id).HasName("PK__Parts__3214EC07EB63EBC2");

            entity.HasOne(d => d.Assembly).WithMany(p => p.Parts).HasConstraintName("FK_Parts_Assembly");

            entity.HasOne(d => d.Colour).WithMany(p => p.Parts).HasConstraintName("FK_Parts_Colour");

            entity.HasOne(d => d.Variant).WithMany(p => p.Parts).HasConstraintName("FK_Parts_Variant");
        });

        modelBuilder.Entity<PartColour>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__PartColo__3214EC07860D322E");

            entity.HasOne(d => d.Colour).WithMany(p => p.PartColours).HasConstraintName("FK_PartColours_VehicleColours");

            entity.HasOne(d => d.Part).WithMany(p => p.PartColours).HasConstraintName("FK_PartColours_Parts");
        });

        modelBuilder.Entity<PartImage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__PartImag__3214EC0780BCCD30");

            entity.HasOne(d => d.Part).WithMany(p => p.PartImages).HasConstraintName("FK__PartImage__PartI__6477ECF3");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.Property(e => e.Username).HasMaxLength(100);
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Vehicles__3214EC07CAF046BD");

            entity.HasOne(d => d.Colour).WithMany(p => p.Vehicles).HasConstraintName("FK__Vehicles__Colour__6A30C649");

            entity.HasOne(d => d.Model).WithMany(p => p.Vehicles).HasConstraintName("FK__Vehicles__ModelI__6B24EA82");

            entity.HasOne(d => d.Variant).WithMany(p => p.Vehicles).HasConstraintName("FK__Vehicles__Varian__6C190EBB");
        });

        modelBuilder.Entity<VehicleColour>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__VehicleC__3214EC07BF7CDFD4");

            entity.HasOne(d => d.Model).WithMany(p => p.VehicleColours).HasConstraintName("FK_Colour_Model");

            entity.HasOne(d => d.Variant).WithMany(p => p.VehicleColours).HasConstraintName("FK_Colour_Variant");
        });

        modelBuilder.Entity<VehicleModel>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__VehicleM__3214EC075752B71A");
        });

        modelBuilder.Entity<VehicleVariant>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__VehicleV__3214EC07CD4FB883");

            entity.HasOne(d => d.Model).WithMany(p => p.VehicleVariants).HasConstraintName("FK__VehicleVa__Model__6D0D32F4");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
