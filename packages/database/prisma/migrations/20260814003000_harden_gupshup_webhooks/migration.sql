-- A mesma identificação do WhatsApp pode aparecer em eventos delivered e read.
DROP INDEX IF EXISTS "message_events_provider_event_id_key";
CREATE INDEX "message_events_provider_event_id_idx" ON "message_events"("provider_event_id");

-- Armazena o identificador do WhatsApp retornado no evento enqueued para
-- correlacionar eventos tardios que eventualmente não contenham gsId.
ALTER TABLE "messages" ADD COLUMN "provider_whatsapp_id" TEXT;
CREATE UNIQUE INDEX "messages_provider_whatsapp_id_key" ON "messages"("provider_whatsapp_id");
