-- CreateTable "IdempotencyKey"
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "response_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "IdempotencyKey_created_at_idx" ON "IdempotencyKey"("created_at");

-- CreateIndex
CREATE INDEX "IdempotencyKey_order_id_idx" ON "IdempotencyKey"("order_id");

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
