/* ============================================================================
   BGauss E-Catalogue — schema update 17.11.2026
   Adds:
     1. IsActive (BIT, default 1) on VehicleModels, VehicleVariants,
        VehicleColours, Assemblies, Parts  → Active / Inactive status
     2. AssemblyHotspots table              → clickable part numbers on drawings
   Individual part images use the EXISTING dbo.PartImages table (no change).

   The script is idempotent (safe to run more than once) and only ADDS objects.
   It is also executed automatically at API start-up by
   Infrastructure/SchemaUpdater.cs unless Database:AutoApplySchemaUpdates=false.
   ============================================================================ */

IF COL_LENGTH('dbo.VehicleModels', 'IsActive') IS NULL
    ALTER TABLE dbo.VehicleModels   ADD IsActive BIT NOT NULL CONSTRAINT DF_VehicleModels_IsActive   DEFAULT (1) WITH VALUES;

IF COL_LENGTH('dbo.VehicleVariants', 'IsActive') IS NULL
    ALTER TABLE dbo.VehicleVariants ADD IsActive BIT NOT NULL CONSTRAINT DF_VehicleVariants_IsActive DEFAULT (1) WITH VALUES;

IF COL_LENGTH('dbo.VehicleColours', 'IsActive') IS NULL
    ALTER TABLE dbo.VehicleColours  ADD IsActive BIT NOT NULL CONSTRAINT DF_VehicleColours_IsActive  DEFAULT (1) WITH VALUES;

IF COL_LENGTH('dbo.Assemblies', 'IsActive') IS NULL
    ALTER TABLE dbo.Assemblies      ADD IsActive BIT NOT NULL CONSTRAINT DF_Assemblies_IsActive      DEFAULT (1) WITH VALUES;

IF COL_LENGTH('dbo.Parts', 'IsActive') IS NULL
    ALTER TABLE dbo.Parts           ADD IsActive BIT NOT NULL CONSTRAINT DF_Parts_IsActive           DEFAULT (1) WITH VALUES;

IF OBJECT_ID('dbo.AssemblyHotspots', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AssemblyHotspots
    (
        Id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AssemblyHotspots PRIMARY KEY,
        AssemblyId  INT              NOT NULL,
        Label       NVARCHAR(50)     NOT NULL,
        PageNumber  INT              NOT NULL CONSTRAINT DF_AssemblyHotspots_PageNumber DEFAULT (1),
        X           FLOAT            NOT NULL,
        Y           FLOAT            NOT NULL,
        Width       FLOAT            NOT NULL,
        Height      FLOAT            NOT NULL,
        CONSTRAINT FK_AssemblyHotspots_Assemblies FOREIGN KEY (AssemblyId)
            REFERENCES dbo.Assemblies (Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_AssemblyHotspots_AssemblyId ON dbo.AssemblyHotspots (AssemblyId);
END;

/* Helpful indexes for the customer catalogue filters (created only if missing) */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Parts_AssemblyId_IsActive' AND object_id = OBJECT_ID('dbo.Parts'))
    CREATE INDEX IX_Parts_AssemblyId_IsActive ON dbo.Parts (AssemblyId, IsActive) INCLUDE (ModelId, VariantId);

/* ---------------------------------------------------------------------------
   ROLLBACK (manual, only if required):
     DROP TABLE dbo.AssemblyHotspots;
     DROP INDEX IX_Parts_AssemblyId_IsActive ON dbo.Parts;
     ALTER TABLE dbo.Parts           DROP CONSTRAINT DF_Parts_IsActive;           ALTER TABLE dbo.Parts           DROP COLUMN IsActive;
     ALTER TABLE dbo.Assemblies      DROP CONSTRAINT DF_Assemblies_IsActive;      ALTER TABLE dbo.Assemblies      DROP COLUMN IsActive;
     ALTER TABLE dbo.VehicleColours  DROP CONSTRAINT DF_VehicleColours_IsActive;  ALTER TABLE dbo.VehicleColours  DROP COLUMN IsActive;
     ALTER TABLE dbo.VehicleVariants DROP CONSTRAINT DF_VehicleVariants_IsActive; ALTER TABLE dbo.VehicleVariants DROP COLUMN IsActive;
     ALTER TABLE dbo.VehicleModels   DROP CONSTRAINT DF_VehicleModels_IsActive;   ALTER TABLE dbo.VehicleModels   DROP COLUMN IsActive;
   --------------------------------------------------------------------------- */
