ALTER TABLE "patients" ADD COLUMN "cns" TEXT;

CREATE INDEX "patients_cns_idx" ON "patients"("cns");
