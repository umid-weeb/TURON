begin;

-- ─── Create idempotency_keys table ────────────────────────────────────────────
create table if not exists public.idempotency_keys (
  key         text        primary key,
  order_id    uuid        not null,
  response_json text      not null,
  created_at  timestamptz not null default now(),
  constraint idempotency_keys_order_id_fk foreign key (order_id) references public.orders(id) on delete cascade
);

-- Index for efficient cleanup of old entries (older than 24 hours)
create index if not exists idx_idempotency_keys_created_at on public.idempotency_keys(created_at);

-- Index for quick order lookups
create index if not exists idx_idempotency_keys_order_id on public.idempotency_keys(order_id);

commit;
