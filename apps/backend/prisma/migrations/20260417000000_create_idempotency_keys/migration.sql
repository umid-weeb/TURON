-- CreateTable "idempotency_keys"
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
    "key" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "response_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idempotency_keys_order_id_idx" ON "idempotency_keys"("order_id");

-- AddForeignKey (skip if already exists)
DO $$ BEGIN
  ALTER TABLE "idempotency_keys"
    ADD CONSTRAINT "idempotency_keys_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
