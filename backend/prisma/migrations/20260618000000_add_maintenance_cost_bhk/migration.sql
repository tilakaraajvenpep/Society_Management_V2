-- CreateTable for MaintenanceCost if it doesn't exist
CREATE TABLE IF NOT EXISTS "MaintenanceCost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "residenceType" TEXT NOT NULL DEFAULT 'COMMON',
    "bhk" TEXT NOT NULL DEFAULT 'COMMON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceCost_tenantId_financialYear_residenceType_bhk_key" ON "MaintenanceCost"("tenantId", "financialYear", "residenceType", "bhk");

-- AddForeignKey (only if not exists - handled gracefully)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceCost_tenantId_fkey'
    ) THEN
        ALTER TABLE "MaintenanceCost" ADD CONSTRAINT "MaintenanceCost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add residenceType and bhk to Member if missing
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Member' AND column_name='residenceType') THEN
        ALTER TABLE "Member" ADD COLUMN "residenceType" TEXT NOT NULL DEFAULT 'COMMON';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Member' AND column_name='bhk') THEN
        ALTER TABLE "Member" ADD COLUMN "bhk" TEXT NOT NULL DEFAULT 'COMMON';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Member' AND column_name='useCommonMaintenance') THEN
        ALTER TABLE "Member" ADD COLUMN "useCommonMaintenance" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Member' AND column_name='registrationYear') THEN
        ALTER TABLE "Member" ADD COLUMN "registrationYear" TEXT;
    END IF;
END $$;
