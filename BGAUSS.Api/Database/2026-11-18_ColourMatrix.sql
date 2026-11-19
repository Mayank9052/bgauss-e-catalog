/* =====================================================================
   BGAUSS E-Catalogue — Colour Matrix files              18.11.2026
   ---------------------------------------------------------------------
   One row per uploaded colour matrix file (Excel .xlsx or PDF).
   A matrix belongs to a Model and may be narrowed to a Variant and/or
   a Colour. Files live in wwwroot/Colour Matrix/. Records are never
   deleted by the application — they are switched Inactive instead.

   Idempotent and additive: safe to run more than once. Applied
   automatically at API start-up (SchemaUpdater) unless
   Database:AutoApplySchemaUpdates = false; otherwise run in SSMS.

   ROLLBACK (manual, only if this feature is withdrawn):
     DROP TABLE dbo.ColourMatrices;
   ===================================================================== */

IF OBJECT_ID(N'dbo.ColourMatrices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ColourMatrices (
        Id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ColourMatrices PRIMARY KEY,
        ModelId          INT            NOT NULL,
        VariantId        INT            NULL,
        ColourId         INT            NULL,
        Title            NVARCHAR(200)  NOT NULL,
        FilePath         NVARCHAR(500)  NOT NULL,
        OriginalFileName NVARCHAR(260)  NOT NULL,
        FileType         NVARCHAR(10)   NOT NULL,
        FileSize         BIGINT         NOT NULL CONSTRAINT DF_ColourMatrices_FileSize DEFAULT (0),
        IsActive         BIT            NOT NULL CONSTRAINT DF_ColourMatrices_IsActive DEFAULT (1),
        UploadedAt       DATETIME2(0)   NOT NULL CONSTRAINT DF_ColourMatrices_UploadedAt DEFAULT (SYSUTCDATETIME()),
        UploadedBy       NVARCHAR(100)  NULL,
        CONSTRAINT FK_ColourMatrices_VehicleModels   FOREIGN KEY (ModelId)   REFERENCES dbo.VehicleModels (Id),
        CONSTRAINT FK_ColourMatrices_VehicleVariants FOREIGN KEY (VariantId) REFERENCES dbo.VehicleVariants (Id),
        CONSTRAINT FK_ColourMatrices_VehicleColours  FOREIGN KEY (ColourId)  REFERENCES dbo.VehicleColours (Id)
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ColourMatrices_Model_Variant_Colour' AND object_id = OBJECT_ID(N'dbo.ColourMatrices'))
    CREATE INDEX IX_ColourMatrices_Model_Variant_Colour ON dbo.ColourMatrices (ModelId, VariantId, ColourId, IsActive);
