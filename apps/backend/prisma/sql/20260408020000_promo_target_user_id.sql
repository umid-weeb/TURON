alter table if exists public.promo_codes
  add column if not exists target_user_id text;

create index if not exists idx_promo_codes_target_user_id
  on public.promo_codes(target_user_id);
