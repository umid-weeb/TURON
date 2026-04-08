begin;

-- ─── 1. customer_rating columns on orders ────────────────────────────────────
alter table "orders"
  add column if not exists "customer_rating"      integer null,
  add column if not exists "customer_rating_note" text    null;

-- ─── 2. chat_sender_role_enum ────────────────────────────────────────────────
do $$ begin
  create type "chat_sender_role_enum" as enum ('COURIER', 'CUSTOMER');
exception when duplicate_object then null;
end $$;

-- ─── 3. order_chat_messages table ────────────────────────────────────────────
create table if not exists "order_chat_messages" (
  "id"          text                     not null,
  "order_id"    text                     not null,
  "sender_id"   text                     not null,
  "sender_role" "chat_sender_role_enum"  not null,
  "content"     text                     not null,
  "is_read"     boolean                  not null default false,
  "created_at"  timestamp(3)             not null default current_timestamp,
  constraint "order_chat_messages_pkey" primary key ("id"),
  constraint "order_chat_messages_order_id_fkey"
    foreign key ("order_id") references "orders"("id") on delete cascade,
  constraint "order_chat_messages_sender_id_fkey"
    foreign key ("sender_id") references "users"("id") on delete cascade
);

create index if not exists "order_chat_messages_order_id_created_at_idx"
  on "order_chat_messages"("order_id", "created_at" asc);

create index if not exists "order_chat_messages_sender_id_idx"
  on "order_chat_messages"("sender_id");

commit;
