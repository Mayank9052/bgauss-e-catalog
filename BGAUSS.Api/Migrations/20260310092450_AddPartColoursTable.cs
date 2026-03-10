using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BGAUSS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPartColoursTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PartColours",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PartId = table.Column<int>(type: "int", nullable: false),
                    ColourId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartColours", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PartColours_Parts_PartId",
                        column: x => x.PartId,
                        principalTable: "Parts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PartColours_VehicleColours_ColourId",
                        column: x => x.ColourId,
                        principalTable: "VehicleColours",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PartColours_ColourId",
                table: "PartColours",
                column: "ColourId");

            migrationBuilder.CreateIndex(
                name: "IX_PartColours_PartId",
                table: "PartColours",
                column: "PartId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PartColours");
        }
    }
}
