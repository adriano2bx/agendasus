ALTER TABLE "convocations" ADD COLUMN "selected_phone_id" UUID;

ALTER TABLE "convocations"
ADD CONSTRAINT "convocations_selected_phone_id_fkey"
FOREIGN KEY ("selected_phone_id") REFERENCES "patient_phones"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "convocations_selected_phone_id_idx" ON "convocations"("selected_phone_id");
