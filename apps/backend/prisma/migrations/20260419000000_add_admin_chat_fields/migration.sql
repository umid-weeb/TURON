-- AlterEnum: Add ADMIN to chat_sender_role_enum
ALTER TYPE "chat_sender_role_enum" ADD VALUE 'ADMIN';

-- AlterTable: Add telegram_message_id and fallback_sent_at to order_chat_messages
ALTER TABLE "order_chat_messages"
  ADD COLUMN "telegram_message_id" BIGINT,
  ADD COLUMN "fallback_sent_at" TIMESTAMP(3);

-- CreateIndex: For fast lookup by telegram_message_id
CREATE INDEX "order_chat_messages_telegram_message_id_idx" ON "order_chat_messages"("telegram_message_id");
