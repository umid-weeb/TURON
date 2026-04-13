-- Add composite index for the most common notification query pattern:
-- listForUser() filters on (userId, roleTarget) and orders by createdAt DESC.
-- Without this index PostgreSQL scans the userId index then filters roleTarget in memory.
create index concurrently if not exists "notifications_user_role_created_idx"
  on "notifications" ("user_id", "role_target", "created_at" desc);
