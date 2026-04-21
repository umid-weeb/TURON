-- AlterTable: Add target_role to order_chat_messages
-- NULL = message visible to all parties (courier↔customer, no targeting)
-- 'COURIER' / 'CUSTOMER' = admin-directed message, only that role sees it
ALTER TABLE "order_chat_messages"
  ADD COLUMN "target_role" "chat_sender_role_enum";

-- Index for fast per-role filtering
CREATE INDEX "order_chat_messages_order_target_role_idx"
  ON "order_chat_messages"("order_id", "target_role");
