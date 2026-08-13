-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUBMITTED', 'FAILED');

-- CreateTable
CREATE TABLE "handoff_events" (
    "id" UUID NOT NULL,
    "convocation_id" UUID NOT NULL,
    "status" "HandoffStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response_payload" JSONB,
    "failure_reason" TEXT,
    "next_attempt_at" TIMESTAMPTZ(3),
    "submitted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "handoff_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "handoff_events_convocation_id_key" ON "handoff_events"("convocation_id");
CREATE UNIQUE INDEX "handoff_events_idempotency_key_key" ON "handoff_events"("idempotency_key");
CREATE INDEX "handoff_events_status_next_attempt_at_idx" ON "handoff_events"("status", "next_attempt_at");

-- AddForeignKey
ALTER TABLE "handoff_events" ADD CONSTRAINT "handoff_events_convocation_id_fkey" FOREIGN KEY ("convocation_id") REFERENCES "convocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
