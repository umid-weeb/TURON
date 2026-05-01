-- Customer-initiated order modification requests (cancel / address-change /
-- other). Mirrors the Yandex Eats / Uber Eats post-confirmation flow:
--   - PENDING orders auto-approve (no admin needed).
--   - PREPARING+ orders create a request that the admin approves or rejects.
--
-- All status values are stored as TEXT (not an enum) so we can extend with
-- new types — ITEM_ADD, ITEM_REMOVE, etc. — without a follow-up migration.

CREATE TABLE "order_modification_requests" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "order_id"      UUID         NOT NULL,
  "requested_by"  UUID         NOT NULL,
  "type"          TEXT         NOT NULL,
  "payload"       JSONB,
  "status"        TEXT         NOT NULL DEFAULT 'PENDING',
  "reason"        TEXT,
  "decided_by"    UUID,
  "decided_at"    TIMESTAMPTZ,
  "decision_note" TEXT,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_modification_requests_order_fk"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "order_modification_requests_requester_fk"
    FOREIGN KEY ("requested_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT "order_modification_requests_decider_fk"
    FOREIGN KEY ("decided_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT "order_modification_requests_type_check"
    CHECK ("type" IN ('CANCEL', 'ADDRESS_CHANGE', 'OTHER')),

  CONSTRAINT "order_modification_requests_status_check"
    CHECK ("status" IN ('PENDING', 'AUTO_APPROVED', 'APPROVED', 'REJECTED'))
);

CREATE INDEX "order_modification_requests_order_created_idx"
  ON "order_modification_requests"("order_id", "created_at" DESC);

CREATE INDEX "order_modification_requests_status_created_idx"
  ON "order_modification_requests"("status", "created_at" DESC);

CREATE INDEX "order_modification_requests_requester_idx"
  ON "order_modification_requests"("requested_by");

CREATE INDEX "order_modification_requests_decider_idx"
  ON "order_modification_requests"("decided_by");

-- Auto-update updated_at on every row mutation
CREATE OR REPLACE FUNCTION "order_modification_requests_set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_order_modification_requests_set_updated_at"
  BEFORE UPDATE ON "order_modification_requests"
  FOR EACH ROW
  EXECUTE FUNCTION "order_modification_requests_set_updated_at"();
