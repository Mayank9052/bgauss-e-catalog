using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BGAUSS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRemarksToParts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AssemblyParts_Assemblies_AssemblyId",
                table: "AssemblyParts");

            migrationBuilder.DropForeignKey(
                name: "FK_AssemblyParts_Parts_PartId",
                table: "AssemblyParts");

            migrationBuilder.DropForeignKey(
                name: "FK_CartItems_Carts_CartId",
                table: "CartItems");

            migrationBuilder.DropForeignKey(
                name: "FK_CartItems_Parts_PartId",
                table: "CartItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Carts_Users_UserId",
                table: "Carts");

            migrationBuilder.DropForeignKey(
                name: "FK_ModelParts_Parts_PartId",
                table: "ModelParts");

            migrationBuilder.DropForeignKey(
                name: "FK_ModelParts_VehicleModels_ModelId",
                table: "ModelParts");

            migrationBuilder.DropForeignKey(
                name: "FK_ModelParts_VehicleVariants_VariantId",
                table: "ModelParts");

            migrationBuilder.DropForeignKey(
                name: "FK_PartColours_Parts_PartId",
                table: "PartColours");

            migrationBuilder.DropForeignKey(
                name: "FK_PartColours_VehicleColours_ColourId",
                table: "PartColours");

            migrationBuilder.DropForeignKey(
                name: "FK_PartImages_Parts_PartId",
                table: "PartImages");

            migrationBuilder.DropForeignKey(
                name: "FK_Parts_Assemblies_AssemblyId",
                table: "Parts");

            migrationBuilder.DropForeignKey(
                name: "FK_Parts_VehicleColours_ColourId",
                table: "Parts");

            migrationBuilder.DropForeignKey(
                name: "FK_Parts_VehicleVariants_VariantId",
                table: "Parts");

            migrationBuilder.DropForeignKey(
                name: "FK_VehicleColours_VehicleModels_ModelId",
                table: "VehicleColours");

            migrationBuilder.DropForeignKey(
                name: "FK_VehicleColours_VehicleVariants_VariantId",
                table: "VehicleColours");

            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_VehicleColours_ColourId",
                table: "Vehicles");

            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_VehicleModels_ModelId",
                table: "Vehicles");

            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_VehicleVariants_VariantId",
                table: "Vehicles");

            migrationBuilder.DropForeignKey(
                name: "FK_VehicleVariants_VehicleModels_ModelId",
                table: "VehicleVariants");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VehicleVariants",
                table: "VehicleVariants");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Vehicles",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_Vin",
                table: "Vehicles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VehicleModels",
                table: "VehicleModels");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VehicleColours",
                table: "VehicleColours");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Parts",
                table: "Parts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PartImages",
                table: "PartImages");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PartColours",
                table: "PartColours");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ModelParts",
                table: "ModelParts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Carts",
                table: "Carts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CartItems",
                table: "CartItems");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AssemblyParts",
                table: "AssemblyParts");

            migrationBuilder.DropIndex(
                name: "IX_AssemblyParts_AssemblyId_PartId",
                table: "AssemblyParts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Assemblies",
                table: "Assemblies");

            migrationBuilder.EnsureSchema(
                name: "dbo");

            migrationBuilder.RenameTable(
                name: "VehicleVariants",
                newName: "VehicleVariants",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Vehicles",
                newName: "Vehicles",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "VehicleModels",
                newName: "VehicleModels",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "VehicleColours",
                newName: "VehicleColours",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Users",
                newName: "Users",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Parts",
                newName: "Parts",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "PartImages",
                newName: "PartImages",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "PartColours",
                newName: "PartColours",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Orders",
                newName: "Orders",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "OrderItems",
                newName: "OrderItems",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "ModelParts",
                newName: "ModelParts",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Carts",
                newName: "Carts",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "CartItems",
                newName: "CartItems",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "AssemblyParts",
                newName: "AssemblyParts",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Assemblies",
                newName: "Assemblies",
                newSchema: "dbo");

            migrationBuilder.RenameColumn(
                name: "Vin",
                schema: "dbo",
                table: "Vehicles",
                newName: "VIN");

            migrationBuilder.RenameColumn(
                name: "Mrp",
                schema: "dbo",
                table: "Parts",
                newName: "MRP");

            migrationBuilder.RenameColumn(
                name: "Bdp",
                schema: "dbo",
                table: "Parts",
                newName: "BDP");

            migrationBuilder.RenameIndex(
                name: "IX_CartItems_CartId_PartId",
                schema: "dbo",
                table: "CartItems",
                newName: "IX_CartItem_Unique");

            migrationBuilder.RenameColumn(
                name: "Frt",
                schema: "dbo",
                table: "AssemblyParts",
                newName: "FRT");

            migrationBuilder.RenameColumn(
                name: "Erp",
                schema: "dbo",
                table: "AssemblyParts",
                newName: "ERP");

            migrationBuilder.AlterColumn<string>(
                name: "VariantName",
                schema: "dbo",
                table: "VehicleVariants",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "VIN",
                schema: "dbo",
                table: "Vehicles",
                type: "nvarchar(17)",
                maxLength: 17,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ModelName",
                schema: "dbo",
                table: "VehicleModels",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ImagePath",
                schema: "dbo",
                table: "VehicleColours",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ColourName",
                schema: "dbo",
                table: "VehicleColours",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Username",
                schema: "dbo",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                schema: "dbo",
                table: "Users",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "PasswordHash",
                schema: "dbo",
                table: "Users",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<decimal>(
                name: "TorqueNm",
                schema: "dbo",
                table: "Parts",
                type: "decimal(10,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PartNumber",
                schema: "dbo",
                table: "Parts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PartName",
                schema: "dbo",
                table: "Parts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Remarks",
                schema: "dbo",
                table: "Parts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ImagePath",
                schema: "dbo",
                table: "PartImages",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "dbo",
                table: "Carts",
                type: "datetime",
                nullable: true,
                defaultValueSql: "(getutcdate())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "AddedAt",
                schema: "dbo",
                table: "CartItems",
                type: "datetime",
                nullable: true,
                defaultValueSql: "(getutcdate())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Remark",
                schema: "dbo",
                table: "AssemblyParts",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "FRT",
                schema: "dbo",
                table: "AssemblyParts",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ERP",
                schema: "dbo",
                table: "AssemblyParts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ImagePath",
                schema: "dbo",
                table: "Assemblies",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AssemblyName",
                schema: "dbo",
                table: "Assemblies",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModelId",
                schema: "dbo",
                table: "Assemblies",
                type: "int",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK__VehicleV__3214EC0703D99E67",
                schema: "dbo",
                table: "VehicleVariants",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__Vehicles__3214EC073BB36037",
                schema: "dbo",
                table: "Vehicles",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__VehicleM__3214EC07368365C6",
                schema: "dbo",
                table: "VehicleModels",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__VehicleC__3214EC074CADA9B6",
                schema: "dbo",
                table: "VehicleColours",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__Parts__3214EC07953498D7",
                schema: "dbo",
                table: "Parts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__PartImag__3214EC07E7DB4E9E",
                schema: "dbo",
                table: "PartImages",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__PartColo__3214EC07FD323B66",
                schema: "dbo",
                table: "PartColours",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__ModelPar__3214EC071E66AC5A",
                schema: "dbo",
                table: "ModelParts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__Carts__3214EC07A0CBBF40",
                schema: "dbo",
                table: "Carts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__CartItem__3214EC07D492E4DC",
                schema: "dbo",
                table: "CartItems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__Assembly__3214EC07D9D45470",
                schema: "dbo",
                table: "AssemblyParts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK__Assembli__3214EC071AD246DD",
                schema: "dbo",
                table: "Assemblies",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "UQ__Vehicles__C5DF234CFF3CF818",
                schema: "dbo",
                table: "Vehicles",
                column: "VIN",
                unique: true,
                filter: "[VIN] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AssemblyParts_AssemblyId",
                schema: "dbo",
                table: "AssemblyParts",
                column: "AssemblyId");

            migrationBuilder.CreateIndex(
                name: "IX_Assemblies_ModelId",
                schema: "dbo",
                table: "Assemblies",
                column: "ModelId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assemblies_Model",
                schema: "dbo",
                table: "Assemblies",
                column: "ModelId",
                principalSchema: "dbo",
                principalTable: "VehicleModels",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__AssemblyP__Assem__05D8E0BE",
                schema: "dbo",
                table: "AssemblyParts",
                column: "AssemblyId",
                principalSchema: "dbo",
                principalTable: "Assemblies",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__AssemblyP__PartI__06CD04F7",
                schema: "dbo",
                table: "AssemblyParts",
                column: "PartId",
                principalSchema: "dbo",
                principalTable: "Parts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__CartItems__CartI__00200768",
                schema: "dbo",
                table: "CartItems",
                column: "CartId",
                principalSchema: "dbo",
                principalTable: "Carts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__CartItems__PartI__01142BA1",
                schema: "dbo",
                table: "CartItems",
                column: "PartId",
                principalSchema: "dbo",
                principalTable: "Parts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__Carts__UserId__7B5B524B",
                schema: "dbo",
                table: "Carts",
                column: "UserId",
                principalSchema: "dbo",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__ModelPart__Model__6477ECF3",
                schema: "dbo",
                table: "ModelParts",
                column: "ModelId",
                principalSchema: "dbo",
                principalTable: "VehicleModels",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__ModelPart__PartI__66603565",
                schema: "dbo",
                table: "ModelParts",
                column: "PartId",
                principalSchema: "dbo",
                principalTable: "Parts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__ModelPart__Varia__656C112C",
                schema: "dbo",
                table: "ModelParts",
                column: "VariantId",
                principalSchema: "dbo",
                principalTable: "VehicleVariants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PartColours_Parts",
                schema: "dbo",
                table: "PartColours",
                column: "PartId",
                principalSchema: "dbo",
                principalTable: "Parts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PartColours_VehicleColours",
                schema: "dbo",
                table: "PartColours",
                column: "ColourId",
                principalSchema: "dbo",
                principalTable: "VehicleColours",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK__PartImage__PartI__693CA210",
                schema: "dbo",
                table: "PartImages",
                column: "PartId",
                principalSchema: "dbo",
                principalTable: "Parts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Parts_Assembly",
                schema: "dbo",
                table: "Parts",
                column: "AssemblyId",
                principalSchema: "dbo",
                principalTable: "Assemblies",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Parts_Colour",
                schema: "dbo",
                table: "Parts",
                column: "ColourId",
                principalSchema: "dbo",
                principalTable: "VehicleColours",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Parts_Variant",
                schema: "dbo",
                table: "Parts",
                column: "VariantId",
                principalSchema: "dbo",
                principalTable: "VehicleVariants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Colour_Model",
                schema: "dbo",
                table: "VehicleColours",
                column: "ModelId",
                principalSchema: "dbo",
                principalTable: "VehicleModels",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Colour_Variant",
                schema: "dbo",
                table: "VehicleColours",
                column: "VariantId",
                principalSchema: "dbo",
                principalTable: "VehicleVariants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__Vehicles__Colour__5CD6CB2B",
                schema: "dbo",
                table: "Vehicles",
                column: "ColourId",
                principalSchema: "dbo",
                principalTable: "VehicleColours",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__Vehicles__ModelI__5AEE82B9",
                schema: "dbo",
                table: "Vehicles",
                column: "ModelId",
                principalSchema: "dbo",
                principalTable: "VehicleModels",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__Vehicles__Varian__5BE2A6F2",
                schema: "dbo",
                table: "Vehicles",
                column: "VariantId",
                principalSchema: "dbo",
                principalTable: "VehicleVariants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__VehicleVa__Model__5535A963",
                schema: "dbo",
                table: "VehicleVariants",
                column: "ModelId",
                principalSchema: "dbo",
                principalTable: "VehicleModels",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assemblies_Model",
                schema: "dbo",
                table: "Assemblies");

            migrationBuilder.DropForeignKey(
                name: "FK__AssemblyP__Assem__05D8E0BE",
                schema: "dbo",
                table: "AssemblyParts");

            migrationBuilder.DropForeignKey(
                name: "FK__AssemblyP__PartI__06CD04F7",
                schema: "dbo",
                table: "AssemblyParts");

            migrationBuilder.DropForeignKey(
                name: "FK__CartItems__CartI__00200768",
                schema: "dbo",
                table: "CartItems");

            migrationBuilder.DropForeignKey(
                name: "FK__CartItems__PartI__01142BA1",
                schema: "dbo",
                table: "CartItems");

            migrationBuilder.DropForeignKey(
                name: "FK__Carts__UserId__7B5B524B",
                schema: "dbo",
                table: "Carts");

            migrationBuilder.DropForeignKey(
                name: "FK__ModelPart__Model__6477ECF3",
                schema: "dbo",
                table: "ModelParts");

            migrationBuilder.DropForeignKey(
                name: "FK__ModelPart__PartI__66603565",
                schema: "dbo",
                table: "ModelParts");

            migrationBuilder.DropForeignKey(
                name: "FK__ModelPart__Varia__656C112C",
                schema: "dbo",
                table: "ModelParts");

            migrationBuilder.DropForeignKey(
                name: "FK_PartColours_Parts",
                schema: "dbo",
                table: "PartColours");

            migrationBuilder.DropForeignKey(
                name: "FK_PartColours_VehicleColours",
                schema: "dbo",
                table: "PartColours");

            migrationBuilder.DropForeignKey(
                name: "FK__PartImage__PartI__693CA210",
                schema: "dbo",
                table: "PartImages");

            migrationBuilder.DropForeignKey(
                name: "FK_Parts_Assembly",
                schema: "dbo",
                table: "Parts");

            migrationBuilder.DropForeignKey(
                name: "FK_Parts_Colour",
                schema: "dbo",
                table: "Parts");

            migrationBuilder.DropForeignKey(
                name: "FK_Parts_Variant",
                schema: "dbo",
                table: "Parts");

            migrationBuilder.DropForeignKey(
                name: "FK_Colour_Model",
                schema: "dbo",
                table: "VehicleColours");

            migrationBuilder.DropForeignKey(
                name: "FK_Colour_Variant",
                schema: "dbo",
                table: "VehicleColours");

            migrationBuilder.DropForeignKey(
                name: "FK__Vehicles__Colour__5CD6CB2B",
                schema: "dbo",
                table: "Vehicles");

            migrationBuilder.DropForeignKey(
                name: "FK__Vehicles__ModelI__5AEE82B9",
                schema: "dbo",
                table: "Vehicles");

            migrationBuilder.DropForeignKey(
                name: "FK__Vehicles__Varian__5BE2A6F2",
                schema: "dbo",
                table: "Vehicles");

            migrationBuilder.DropForeignKey(
                name: "FK__VehicleVa__Model__5535A963",
                schema: "dbo",
                table: "VehicleVariants");

            migrationBuilder.DropPrimaryKey(
                name: "PK__VehicleV__3214EC0703D99E67",
                schema: "dbo",
                table: "VehicleVariants");

            migrationBuilder.DropPrimaryKey(
                name: "PK__Vehicles__3214EC073BB36037",
                schema: "dbo",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "UQ__Vehicles__C5DF234CFF3CF818",
                schema: "dbo",
                table: "Vehicles");

            migrationBuilder.DropPrimaryKey(
                name: "PK__VehicleM__3214EC07368365C6",
                schema: "dbo",
                table: "VehicleModels");

            migrationBuilder.DropPrimaryKey(
                name: "PK__VehicleC__3214EC074CADA9B6",
                schema: "dbo",
                table: "VehicleColours");

            migrationBuilder.DropPrimaryKey(
                name: "PK__Parts__3214EC07953498D7",
                schema: "dbo",
                table: "Parts");

            migrationBuilder.DropPrimaryKey(
                name: "PK__PartImag__3214EC07E7DB4E9E",
                schema: "dbo",
                table: "PartImages");

            migrationBuilder.DropPrimaryKey(
                name: "PK__PartColo__3214EC07FD323B66",
                schema: "dbo",
                table: "PartColours");

            migrationBuilder.DropPrimaryKey(
                name: "PK__ModelPar__3214EC071E66AC5A",
                schema: "dbo",
                table: "ModelParts");

            migrationBuilder.DropPrimaryKey(
                name: "PK__Carts__3214EC07A0CBBF40",
                schema: "dbo",
                table: "Carts");

            migrationBuilder.DropPrimaryKey(
                name: "PK__CartItem__3214EC07D492E4DC",
                schema: "dbo",
                table: "CartItems");

            migrationBuilder.DropPrimaryKey(
                name: "PK__Assembly__3214EC07D9D45470",
                schema: "dbo",
                table: "AssemblyParts");

            migrationBuilder.DropIndex(
                name: "IX_AssemblyParts_AssemblyId",
                schema: "dbo",
                table: "AssemblyParts");

            migrationBuilder.DropPrimaryKey(
                name: "PK__Assembli__3214EC071AD246DD",
                schema: "dbo",
                table: "Assemblies");

            migrationBuilder.DropIndex(
                name: "IX_Assemblies_ModelId",
                schema: "dbo",
                table: "Assemblies");

            migrationBuilder.DropColumn(
                name: "Remarks",
                schema: "dbo",
                table: "Parts");

            migrationBuilder.DropColumn(
                name: "ModelId",
                schema: "dbo",
                table: "Assemblies");

            migrationBuilder.RenameTable(
                name: "VehicleVariants",
                schema: "dbo",
                newName: "VehicleVariants");

            migrationBuilder.RenameTable(
                name: "Vehicles",
                schema: "dbo",
                newName: "Vehicles");

            migrationBuilder.RenameTable(
                name: "VehicleModels",
                schema: "dbo",
                newName: "VehicleModels");

            migrationBuilder.RenameTable(
                name: "VehicleColours",
                schema: "dbo",
                newName: "VehicleColours");

            migrationBuilder.RenameTable(
                name: "Users",
                schema: "dbo",
                newName: "Users");

            migrationBuilder.RenameTable(
                name: "Parts",
                schema: "dbo",
                newName: "Parts");

            migrationBuilder.RenameTable(
                name: "PartImages",
                schema: "dbo",
                newName: "PartImages");

            migrationBuilder.RenameTable(
                name: "PartColours",
                schema: "dbo",
                newName: "PartColours");

            migrationBuilder.RenameTable(
                name: "Orders",
                schema: "dbo",
                newName: "Orders");

            migrationBuilder.RenameTable(
                name: "OrderItems",
                schema: "dbo",
                newName: "OrderItems");

            migrationBuilder.RenameTable(
                name: "ModelParts",
                schema: "dbo",
                newName: "ModelParts");

            migrationBuilder.RenameTable(
                name: "Carts",
                schema: "dbo",
                newName: "Carts");

            migrationBuilder.RenameTable(
                name: "CartItems",
                schema: "dbo",
                newName: "CartItems");

            migrationBuilder.RenameTable(
                name: "AssemblyParts",
                schema: "dbo",
                newName: "AssemblyParts");

            migrationBuilder.RenameTable(
                name: "Assemblies",
                schema: "dbo",
                newName: "Assemblies");

            migrationBuilder.RenameColumn(
                name: "VIN",
                table: "Vehicles",
                newName: "Vin");

            migrationBuilder.RenameColumn(
                name: "MRP",
                table: "Parts",
                newName: "Mrp");

            migrationBuilder.RenameColumn(
                name: "BDP",
                table: "Parts",
                newName: "Bdp");

            migrationBuilder.RenameIndex(
                name: "IX_CartItem_Unique",
                table: "CartItems",
                newName: "IX_CartItems_CartId_PartId");

            migrationBuilder.RenameColumn(
                name: "FRT",
                table: "AssemblyParts",
                newName: "Frt");

            migrationBuilder.RenameColumn(
                name: "ERP",
                table: "AssemblyParts",
                newName: "Erp");

            migrationBuilder.AlterColumn<string>(
                name: "VariantName",
                table: "VehicleVariants",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Vin",
                table: "Vehicles",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(17)",
                oldMaxLength: 17,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ModelName",
                table: "VehicleModels",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "ImagePath",
                table: "VehicleColours",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ColourName",
                table: "VehicleColours",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Username",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "PasswordHash",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<decimal>(
                name: "TorqueNm",
                table: "Parts",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(10,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PartNumber",
                table: "Parts",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PartName",
                table: "Parts",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ImagePath",
                table: "PartImages",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Carts",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true,
                oldDefaultValueSql: "(getutcdate())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "AddedAt",
                table: "CartItems",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true,
                oldDefaultValueSql: "(getutcdate())");

            migrationBuilder.AlterColumn<string>(
                name: "Remark",
                table: "AssemblyParts",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Frt",
                table: "AssemblyParts",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Erp",
                table: "AssemblyParts",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ImagePath",
                table: "Assemblies",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AssemblyName",
                table: "Assemblies",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_VehicleVariants",
                table: "VehicleVariants",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Vehicles",
                table: "Vehicles",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_VehicleModels",
                table: "VehicleModels",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_VehicleColours",
                table: "VehicleColours",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Parts",
                table: "Parts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PartImages",
                table: "PartImages",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PartColours",
                table: "PartColours",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ModelParts",
                table: "ModelParts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Carts",
                table: "Carts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CartItems",
                table: "CartItems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AssemblyParts",
                table: "AssemblyParts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Assemblies",
                table: "Assemblies",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_Vin",
                table: "Vehicles",
                column: "Vin",
                unique: true,
                filter: "[Vin] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AssemblyParts_AssemblyId_PartId",
                table: "AssemblyParts",
                columns: new[] { "AssemblyId", "PartId" },
                unique: true,
                filter: "[AssemblyId] IS NOT NULL AND [PartId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_AssemblyParts_Assemblies_AssemblyId",
                table: "AssemblyParts",
                column: "AssemblyId",
                principalTable: "Assemblies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AssemblyParts_Parts_PartId",
                table: "AssemblyParts",
                column: "PartId",
                principalTable: "Parts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CartItems_Carts_CartId",
                table: "CartItems",
                column: "CartId",
                principalTable: "Carts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CartItems_Parts_PartId",
                table: "CartItems",
                column: "PartId",
                principalTable: "Parts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Carts_Users_UserId",
                table: "Carts",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ModelParts_Parts_PartId",
                table: "ModelParts",
                column: "PartId",
                principalTable: "Parts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ModelParts_VehicleModels_ModelId",
                table: "ModelParts",
                column: "ModelId",
                principalTable: "VehicleModels",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ModelParts_VehicleVariants_VariantId",
                table: "ModelParts",
                column: "VariantId",
                principalTable: "VehicleVariants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PartColours_Parts_PartId",
                table: "PartColours",
                column: "PartId",
                principalTable: "Parts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PartColours_VehicleColours_ColourId",
                table: "PartColours",
                column: "ColourId",
                principalTable: "VehicleColours",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PartImages_Parts_PartId",
                table: "PartImages",
                column: "PartId",
                principalTable: "Parts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Parts_Assemblies_AssemblyId",
                table: "Parts",
                column: "AssemblyId",
                principalTable: "Assemblies",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Parts_VehicleColours_ColourId",
                table: "Parts",
                column: "ColourId",
                principalTable: "VehicleColours",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Parts_VehicleVariants_VariantId",
                table: "Parts",
                column: "VariantId",
                principalTable: "VehicleVariants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_VehicleColours_VehicleModels_ModelId",
                table: "VehicleColours",
                column: "ModelId",
                principalTable: "VehicleModels",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_VehicleColours_VehicleVariants_VariantId",
                table: "VehicleColours",
                column: "VariantId",
                principalTable: "VehicleVariants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_VehicleColours_ColourId",
                table: "Vehicles",
                column: "ColourId",
                principalTable: "VehicleColours",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_VehicleModels_ModelId",
                table: "Vehicles",
                column: "ModelId",
                principalTable: "VehicleModels",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_VehicleVariants_VariantId",
                table: "Vehicles",
                column: "VariantId",
                principalTable: "VehicleVariants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_VehicleVariants_VehicleModels_ModelId",
                table: "VehicleVariants",
                column: "ModelId",
                principalTable: "VehicleModels",
                principalColumn: "Id");
        }
    }
}
