-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'READY_FOR_REVIEW', 'APPROVED', 'FAILED');

-- CreateEnum
CREATE TYPE "RowValidationStatus" AS ENUM ('VALID', 'WARNING', 'INVALID');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConvocationStage" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'FINISHED');

-- CreateEnum
CREATE TYPE "ConvocationStatus" AS ENUM ('SCHEDULED', 'QUEUED', 'PROCESSING', 'WAITING_RESPONSE', 'CONFIRMED', 'CANCELLED', 'SEND_ERROR', 'FINISHED_NO_RESPONSE');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUBMITTED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "ResponseAction" AS ENUM ('CONFIRM', 'CANCEL', 'FREE_TEXT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports" (
    "id" UUID NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "layout" TEXT,
    "total_reported" INTEGER,
    "records_found" INTEGER NOT NULL DEFAULT 0,
    "validation_summary" JSONB,
    "warnings" JSONB,
    "failure_reason" TEXT,
    "approved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_files" (
    "id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "temporary_key" TEXT,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "import_file_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "raw_data" JSONB NOT NULL,
    "normalized_data" JSONB,
    "validation_status" "RowValidationStatus" NOT NULL,
    "validation_issues" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "cpf" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_phones" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "original_value" TEXT NOT NULL,
    "normalized_value" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "mobile" BOOLEAN NOT NULL,
    "selected_for_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "first_action_at" TIMESTAMPTZ(3),
    "second_interval_days" INTEGER,
    "second_start_time" TEXT,
    "third_interval_days" INTEGER,
    "third_start_time" TEXT,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_records" (
    "id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "import_row_id" UUID NOT NULL,
    "codigo_convocacao_origem" TEXT NOT NULL,
    "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" UUID NOT NULL,
    "source_record_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convocations" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "stage" "ConvocationStage" NOT NULL DEFAULT 'FIRST',
    "status" "ConvocationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "next_action_at" TIMESTAMPTZ(3),
    "confirmed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "convocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convocation_records" (
    "convocation_id" UUID NOT NULL,
    "source_record_id" UUID NOT NULL,

    CONSTRAINT "convocation_records_pkey" PRIMARY KEY ("convocation_id","source_record_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "convocation_id" UUID NOT NULL,
    "stage" "ConvocationStage" NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "template_name" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_message_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "submitted_at" TIMESTAMPTZ(3),
    "sent_at" TIMESTAMPTZ(3),
    "delivered_at" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),
    "failed_at" TIMESTAMPTZ(3),
    "failure_code" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_events" (
    "id" UUID NOT NULL,
    "message_id" UUID,
    "provider_message_id" TEXT,
    "provider_event_id" TEXT,
    "event_type" TEXT NOT NULL,
    "deduplication_key" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "payload" JSONB NOT NULL,
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processing_error" TEXT,

    CONSTRAINT "message_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_responses" (
    "id" UUID NOT NULL,
    "message_id" UUID,
    "convocation_id" UUID NOT NULL,
    "action" "ResponseAction" NOT NULL,
    "source_stage" "ConvocationStage",
    "raw_text" TEXT,
    "received_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "provider_message_id" TEXT,
    "provider_event_id" TEXT,
    "billable" BOOLEAN NOT NULL,
    "category" TEXT,
    "status" TEXT,
    "cost" DECIMAL(12,6),
    "currency" VARCHAR(3),
    "billing_at" TIMESTAMPTZ(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "previous_data" JSONB,
    "new_data" JSONB,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "imports_status_created_at_idx" ON "imports"("status", "created_at");

-- CreateIndex
CREATE INDEX "import_files_import_id_idx" ON "import_files"("import_id");

-- CreateIndex
CREATE INDEX "import_rows_import_id_validation_status_idx" ON "import_rows"("import_id", "validation_status");

-- CreateIndex
CREATE UNIQUE INDEX "import_rows_import_file_id_row_number_key" ON "import_rows"("import_file_id", "row_number");

-- CreateIndex
CREATE INDEX "patients_cpf_idx" ON "patients"("cpf");

-- CreateIndex
CREATE INDEX "patients_normalized_name_birth_date_idx" ON "patients"("normalized_name", "birth_date");

-- CreateIndex
CREATE INDEX "patient_phones_normalized_value_idx" ON "patient_phones"("normalized_value");

-- CreateIndex
CREATE UNIQUE INDEX "patient_phones_patient_id_normalized_value_key" ON "patient_phones"("patient_id", "normalized_value");

-- CreateIndex
CREATE INDEX "campaigns_status_first_action_at_idx" ON "campaigns"("status", "first_action_at");

-- CreateIndex
CREATE UNIQUE INDEX "source_records_import_row_id_key" ON "source_records"("import_row_id");

-- CreateIndex
CREATE INDEX "source_records_import_id_idx" ON "source_records"("import_id");

-- CreateIndex
CREATE INDEX "source_records_codigo_convocacao_origem_idx" ON "source_records"("codigo_convocacao_origem");

-- CreateIndex
CREATE INDEX "procedures_source_record_id_idx" ON "procedures"("source_record_id");

-- CreateIndex
CREATE INDEX "convocations_status_next_action_at_idx" ON "convocations"("status", "next_action_at");

-- CreateIndex
CREATE INDEX "convocations_campaign_id_stage_status_idx" ON "convocations"("campaign_id", "stage", "status");

-- CreateIndex
CREATE UNIQUE INDEX "convocations_campaign_id_patient_id_key" ON "convocations"("campaign_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_provider_message_id_key" ON "messages"("provider_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_idempotency_key_key" ON "messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "messages_convocation_id_created_at_idx" ON "messages"("convocation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_status_created_at_idx" ON "messages"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "messages_convocation_id_stage_attempt_number_key" ON "messages"("convocation_id", "stage", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "message_events_provider_event_id_key" ON "message_events"("provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_events_deduplication_key_key" ON "message_events"("deduplication_key");

-- CreateIndex
CREATE INDEX "message_events_processing_status_received_at_idx" ON "message_events"("processing_status", "received_at");

-- CreateIndex
CREATE INDEX "message_events_provider_message_id_idx" ON "message_events"("provider_message_id");

-- CreateIndex
CREATE INDEX "message_responses_convocation_id_received_at_idx" ON "message_responses"("convocation_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_provider_event_id_key" ON "billing_events"("provider_event_id");

-- CreateIndex
CREATE INDEX "billing_events_billing_at_idx" ON "billing_events"("billing_at");

-- CreateIndex
CREATE INDEX "billing_events_message_id_idx" ON "billing_events"("message_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "import_files" ADD CONSTRAINT "import_files_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_file_id_fkey" FOREIGN KEY ("import_file_id") REFERENCES "import_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_phones" ADD CONSTRAINT "patient_phones_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_import_row_id_fkey" FOREIGN KEY ("import_row_id") REFERENCES "import_rows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocations" ADD CONSTRAINT "convocations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocations" ADD CONSTRAINT "convocations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocation_records" ADD CONSTRAINT "convocation_records_convocation_id_fkey" FOREIGN KEY ("convocation_id") REFERENCES "convocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocation_records" ADD CONSTRAINT "convocation_records_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_convocation_id_fkey" FOREIGN KEY ("convocation_id") REFERENCES "convocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_responses" ADD CONSTRAINT "message_responses_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_responses" ADD CONSTRAINT "message_responses_convocation_id_fkey" FOREIGN KEY ("convocation_id") REFERENCES "convocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
