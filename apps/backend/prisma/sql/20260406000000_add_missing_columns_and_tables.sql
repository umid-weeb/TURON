begin;

-- ─── 1. user_type_enum ────────────────────────────────────────────────────────
do $$ begin
  create type public.user_type_enum as enum ('REGULAR', 'VIP', 'TEST');
exception when duplicate_object then null;
end $$;

-- ─── 2. special_event_type_enum ───────────────────────────────────────────────
do $$ begin
  create type public.special_event_type_enum as enum ('BIRTHDAY', 'FRIDAY', 'HOLIDAY', 'CAMPAIGN');
exception when duplicate_object then null;
end $$;

-- ─── 3. courier_assignment_event_type_enum ────────────────────────────────────
-- (safe to re-run — adding enum type that may already exist from a previous migration)
do $$ begin
  create type public.courier_assignment_event_type_enum as enum (
    'ASSIGNED', 'ACCEPTED', 'ARRIVED_AT_RESTAURANT', 'PICKED_UP',
    'DELIVERING', 'ARRIVED_AT_DESTINATION', 'DELIVERED', 'CANCELLED', 'PROBLEM_REPORTED'
  );
exception when duplicate_object then null;
end $$;

-- ─── 4. Missing columns on users ─────────────────────────────────────────────
alter table if exists public.users
  add column if not exists type                     public.user_type_enum   not null default 'REGULAR',
  add column if not exists preferred_payment_method public.payment_method_enum,
  add column if not exists user_discount_percent    numeric(5,2)            not null default 0,
  add column if not exists birthday                 timestamptz,
  add column if not exists registration_date        timestamptz             not null default now(),
  add column if not exists total_spent              numeric(12,2)           not null default 0;

create index if not exists idx_users_type_active on public.users(type, is_active);

-- ─── 5. restaurant_settings table ────────────────────────────────────────────
create table if not exists public.restaurant_settings (
  id          uuid        primary key default gen_random_uuid(),
  key         text        not null,
  value       text        not null,
  data_type   text        not null default 'string',
  updated_at  timestamptz not null default now(),
  updated_by  uuid        references public.users(id) on delete set null,
  constraint restaurant_settings_key_key unique (key),
  constraint restaurant_settings_key_not_blank check (btrim(key) <> ''),
  constraint restaurant_settings_data_type_valid check (data_type in ('string', 'number', 'json', 'boolean'))
);

create index if not exists idx_restaurant_settings_key on public.restaurant_settings(key);

-- auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_restaurant_settings_set_updated_at on public.restaurant_settings;
create trigger trg_restaurant_settings_set_updated_at
  before update on public.restaurant_settings
  for each row execute function public.set_updated_at();

-- ─── 6. special_events table ─────────────────────────────────────────────────
create table if not exists public.special_events (
  id                       uuid                         primary key default gen_random_uuid(),
  event_name               text                         not null,
  event_type               public.special_event_type_enum not null,
  description              text,
  is_active                boolean                      not null default true,
  occurs_date              timestamptz,
  occurs_day_of_week       integer,
  free_item_ids            text[]                       not null default '{}',
  discount_percent         numeric(5,2),
  discount_amount          numeric(10,2),
  min_order_amount         numeric(10,2),
  applicable_category_ids  text[]                       not null default '{}',
  created_at               timestamptz                  not null default now(),
  updated_at               timestamptz                  not null default now(),
  constraint special_events_event_name_not_blank check (btrim(event_name) <> ''),
  constraint special_events_occurs_day_of_week_valid check (occurs_day_of_week is null or occurs_day_of_week between 1 and 7)
);

create index if not exists idx_special_events_active_occurs_date on public.special_events(is_active, occurs_date);

-- ─── 7. daily_reports table ──────────────────────────────────────────────────
create table if not exists public.daily_reports (
  id                        uuid          primary key default gen_random_uuid(),
  report_date               date          not null,
  total_orders              integer       not null default 0,
  completed_orders          integer       not null default 0,
  cancelled_orders          integer       not null default 0,
  test_orders               integer       not null default 0,
  cash_revenue              numeric(12,2) not null default 0,
  card_revenue              numeric(12,2) not null default 0,
  total_revenue             numeric(12,2) not null default 0,
  total_discounts           numeric(12,2) not null default 0,
  new_customers             integer       not null default 0,
  repeat_customers          integer       not null default 0,
  couriers_active           integer       not null default 0,
  total_distance_km         numeric(10,2) not null default 0,
  avg_delivery_time_minutes numeric(5,2)  not null default 0,
  avg_customer_rating       numeric(3,2),
  created_at                timestamptz   not null default now(),
  constraint daily_reports_report_date_key unique (report_date)
);

create index if not exists idx_daily_reports_report_date on public.daily_reports(report_date desc);

-- ─── 8. payment_user_settings table ──────────────────────────────────────────
create table if not exists public.payment_user_settings (
  id               uuid                    primary key default gen_random_uuid(),
  user_id          uuid                    not null references public.users(id) on delete cascade,
  payment_method   public.payment_method_enum,
  allow_from_date  timestamptz,
  allow_until_date timestamptz,
  min_amount       numeric(10,2),
  max_amount       numeric(10,2),
  created_at       timestamptz             not null default now()
);

create index if not exists idx_payment_user_settings_user_id on public.payment_user_settings(user_id);

-- ─── 9. Missing columns on orders (if any) ───────────────────────────────────
alter table if exists public.orders
  add column if not exists is_test_order             boolean      not null default false,
  add column if not exists approved_by               uuid         references public.users(id) on delete set null,
  add column if not exists approved_at               timestamptz,
  add column if not exists cancellation_reason       text,
  add column if not exists cancelled_by_role         text,
  add column if not exists card_last_4               text;

create index if not exists idx_orders_is_test_order on public.orders(is_test_order) where is_test_order = true;

-- ─── 10. Missing columns on menu_items ───────────────────────────────────────
alter table if exists public.menu_items
  add column if not exists preparation_time integer default 15,
  add column if not exists calories         integer,
  add column if not exists ingredients      text,
  add column if not exists allergens        text,
  add column if not exists created_by       uuid references public.users(id) on delete set null,
  add column if not exists updated_by       uuid references public.users(id) on delete set null;

commit;
