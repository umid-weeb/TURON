-- Restaurant snapshot fields are captured at order creation time.
-- The production migration runner reads prisma/sql, so keep this file here
-- in addition to the Prisma migrations folder.

alter table public.orders
  add column if not exists restaurant_name         text,
  add column if not exists restaurant_phone        text,
  add column if not exists restaurant_address_text text,
  add column if not exists restaurant_lon          numeric(10,7),
  add column if not exists restaurant_lat          numeric(10,7);

