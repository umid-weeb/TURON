-- ============================================================
-- Migration: Add missing columns, enums, and tables
-- This migration is safe to re-run (uses IF NOT EXISTS / IF column NOT EXISTS).
-- ============================================================

-- ─── 1. Missing enum types ────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "user_type_enum" AS ENUM ('REGULAR', 'VIP', 'TEST');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "menu_item_availability_enum" AS ENUM ('AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'OUT_OF_STOCK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "special_event_type_enum" AS ENUM ('BIRTHDAY', 'FRIDAY', 'HOLIDAY', 'CAMPAIGN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "courier_assignment_event_type_enum" AS ENUM (
    'ASSIGNED', 'ACCEPTED', 'ARRIVED_AT_RESTAURANT', 'PICKED_UP',
    'DELIVERING', 'ARRIVED_AT_DESTINATION', 'DELIVERED', 'CANCELLED', 'PROBLEM_REPORTED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add missing values to notification_type_enum (can only add, not remove)
DO $$ BEGIN ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'INFO'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'SUCCESS'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'WARNING'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'ERROR'; EXCEPTION WHEN others THEN null; END $$;

-- ─── 2. Missing columns on users table ───────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "type"                     "user_type_enum"       NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS "preferred_payment_method" "payment_method_enum"  NULL,
  ADD COLUMN IF NOT EXISTS "user_discount_percent"    DECIMAL(5,2)           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "birthday"                 TIMESTAMP(3)           NULL,
  ADD COLUMN IF NOT EXISTS "registration_date"        TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "total_spent"              DECIMAL(12,2)          NOT NULL DEFAULT 0;

-- ─── 3. Missing columns on menu_items table ──────────────────────────────────

ALTER TABLE "menu_items"
  ADD COLUMN IF NOT EXISTS "availability_status" "menu_item_availability_enum" NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS "old_price"            DECIMAL(12,2)  NULL,
  ADD COLUMN IF NOT EXISTS "weight_text"          TEXT           NULL,
  ADD COLUMN IF NOT EXISTS "badge_text"           TEXT           NULL,
  ADD COLUMN IF NOT EXISTS "is_discounted"        BOOLEAN        NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "discount_percent"     INTEGER        NULL,
  ADD COLUMN IF NOT EXISTS "preparation_time"     INTEGER        DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "calories"             INTEGER        NULL,
  ADD COLUMN IF NOT EXISTS "ingredients"          TEXT           NULL,
  ADD COLUMN IF NOT EXISTS "allergens"            TEXT           NULL,
  ADD COLUMN IF NOT EXISTS "created_by"           TEXT           NULL,
  ADD COLUMN IF NOT EXISTS "updated_by"           TEXT           NULL;

-- ─── 4. Missing columns on orders table ──────────────────────────────────────

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "is_test_order"              BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "approved_by"                TEXT          NULL,
  ADD COLUMN IF NOT EXISTS "approved_at"                TIMESTAMP(3)  NULL,
  ADD COLUMN IF NOT EXISTS "cancellation_reason"        TEXT          NULL,
  ADD COLUMN IF NOT EXISTS "cancelled_by_role"          TEXT          NULL,
  ADD COLUMN IF NOT EXISTS "card_last_4"                TEXT          NULL,
  ADD COLUMN IF NOT EXISTS "delivery_fee_rule_code"     TEXT          NULL,
  ADD COLUMN IF NOT EXISTS "delivery_fee_base_amount"   DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS "delivery_fee_extra_amount"  DECIMAL(12,2) NULL;

-- ─── 5. restaurant_settings table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "restaurant_settings" (
  "id"          TEXT         NOT NULL,
  "key"         TEXT         NOT NULL,
  "value"       TEXT         NOT NULL,
  "data_type"   TEXT         NOT NULL,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"  TEXT         NULL,
  CONSTRAINT "restaurant_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "restaurant_settings_key_key" UNIQUE ("key")
);

-- ─── 6. audit_logs table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"            TEXT          NOT NULL,
  "actor_user_id" TEXT          NULL,
  "actor_role"    "user_role_enum" NULL,
  "action_type"   TEXT          NOT NULL,
  "entity_type"   TEXT          NOT NULL,
  "entity_id"     TEXT          NOT NULL,
  "before_state"  JSONB         NULL,
  "after_state"   JSONB         NULL,
  "metadata"      JSONB         NULL,
  "created_at"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_action_type_created_at_idx" ON "audit_logs"("action_type", "created_at" DESC);

-- ─── 7. courier_operational_status table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS "courier_operational_status" (
  "courier_id"          TEXT         NOT NULL,
  "is_online"           BOOLEAN      NOT NULL DEFAULT false,
  "is_accepting_orders" BOOLEAN      NOT NULL DEFAULT false,
  "last_online_at"      TIMESTAMP(3) NULL,
  "last_offline_at"     TIMESTAMP(3) NULL,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courier_operational_status_pkey" PRIMARY KEY ("courier_id")
);

CREATE INDEX IF NOT EXISTS "courier_operational_status_is_online_is_accepting_orders_idx"
  ON "courier_operational_status"("is_online", "is_accepting_orders", "updated_at" DESC);

-- ─── 8. courier_presence table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "courier_presence" (
  "courier_id"             TEXT           NOT NULL,
  "order_id"               TEXT           NULL,
  "latitude"               DECIMAL(10, 7) NOT NULL,
  "longitude"              DECIMAL(10, 7) NOT NULL,
  "heading"                DOUBLE PRECISION NULL,
  "speed_kmh"              DOUBLE PRECISION NULL,
  "remaining_distance_km"  DOUBLE PRECISION NULL,
  "remaining_eta_minutes"  INTEGER        NULL,
  "created_at"             TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"             TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courier_presence_pkey" PRIMARY KEY ("courier_id")
);

CREATE INDEX IF NOT EXISTS "courier_presence_order_id_updated_at_idx" ON "courier_presence"("order_id", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "courier_presence_updated_at_idx" ON "courier_presence"("updated_at" DESC);

-- ─── 9. courier_assignment_events table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "courier_assignment_events" (
  "id"            TEXT                                  NOT NULL,
  "assignment_id" TEXT                                  NOT NULL,
  "order_id"      TEXT                                  NOT NULL,
  "courier_id"    TEXT                                  NOT NULL,
  "event_type"    "courier_assignment_event_type_enum"  NOT NULL,
  "event_at"      TIMESTAMP(3)                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload"       JSONB                                 NULL,
  "actor_user_id" TEXT                                  NULL,
  "created_at"    TIMESTAMP(3)                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courier_assignment_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "courier_assignment_events_assignment_id_event_at_idx" ON "courier_assignment_events"("assignment_id", "event_at" DESC);
CREATE INDEX IF NOT EXISTS "courier_assignment_events_order_id_event_at_idx" ON "courier_assignment_events"("order_id", "event_at" DESC);
CREATE INDEX IF NOT EXISTS "courier_assignment_events_courier_id_event_at_idx" ON "courier_assignment_events"("courier_id", "event_at" DESC);

-- ─── 10. special_events table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "special_events" (
  "id"                       TEXT                    NOT NULL,
  "event_name"               TEXT                    NOT NULL,
  "event_type"               "special_event_type_enum" NOT NULL,
  "description"              TEXT                    NULL,
  "is_active"                BOOLEAN                 NOT NULL DEFAULT true,
  "occurs_date"              TIMESTAMP(3)            NULL,
  "occurs_day_of_week"       INTEGER                 NULL,
  "free_item_ids"            TEXT[]                  NOT NULL DEFAULT '{}',
  "discount_percent"         DECIMAL(5, 2)           NULL,
  "discount_amount"          DECIMAL(10, 2)          NULL,
  "min_order_amount"         DECIMAL(10, 2)          NULL,
  "applicable_category_ids"  TEXT[]                  NOT NULL DEFAULT '{}',
  "created_at"               TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "special_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "special_events_is_active_occurs_date_idx" ON "special_events"("is_active", "occurs_date");

-- ─── 11. daily_reports table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "daily_reports" (
  "id"                        TEXT          NOT NULL,
  "report_date"               TIMESTAMP(3)  NOT NULL,
  "total_orders"              INTEGER       NOT NULL DEFAULT 0,
  "completed_orders"          INTEGER       NOT NULL DEFAULT 0,
  "cancelled_orders"          INTEGER       NOT NULL DEFAULT 0,
  "test_orders"               INTEGER       NOT NULL DEFAULT 0,
  "cash_revenue"              DECIMAL(12,2) NOT NULL DEFAULT 0,
  "card_revenue"              DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_revenue"             DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_discounts"           DECIMAL(12,2) NOT NULL DEFAULT 0,
  "new_customers"             INTEGER       NOT NULL DEFAULT 0,
  "repeat_customers"          INTEGER       NOT NULL DEFAULT 0,
  "couriers_active"           INTEGER       NOT NULL DEFAULT 0,
  "total_distance_km"         DECIMAL(10,2) NOT NULL DEFAULT 0,
  "avg_delivery_time_minutes" DECIMAL(5,2)  NOT NULL DEFAULT 0,
  "avg_customer_rating"       DECIMAL(3,2)  NULL,
  "created_at"                TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_reports_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "daily_reports_report_date_key" UNIQUE ("report_date")
);

CREATE INDEX IF NOT EXISTS "daily_reports_report_date_idx" ON "daily_reports"("report_date");

-- ─── 12. payment_user_settings table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "payment_user_settings" (
  "id"              TEXT                  NOT NULL,
  "user_id"         TEXT                  NOT NULL,
  "payment_method"  "payment_method_enum" NULL,
  "allow_from_date" TIMESTAMP(3)          NULL,
  "allow_until_date" TIMESTAMP(3)         NULL,
  "min_amount"      DECIMAL(10, 2)        NULL,
  "max_amount"      DECIMAL(10, 2)        NULL,
  "created_at"      TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_user_settings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_user_settings_user_id_idx" ON "payment_user_settings"("user_id");

-- ─── 13. Additional indexes for users ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "users_type_is_active_idx" ON "users"("type", "is_active");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users"("created_at" DESC);
