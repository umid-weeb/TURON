# 🔧 Supabase Idempotency Keys Migration - URGENT FIX

## Problem
Customer orders failing with error:
```
Invalid `prisma.idempotencyKey.findUnique()` invocation: 
The table `public.idempotency_keys` does not exist in the current database.
```

## Solution: Apply Migration Now

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **TURON** project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Copy & Run SQL Migration
Copy the SQL below and paste into the SQL editor:

```sql
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
```

### Step 3: Execute Query
1. Click **Run** button (or `Ctrl+Enter`)
2. Wait for success message: `Query executed successfully`

### Step 4: Verify Table Created
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name='idempotency_keys' AND table_schema='public';
```
Expected result: 1 row with `idempotency_keys`

---

## ✅ Verification Commands

After migration, run this in Supabase SQL Editor to confirm:

```sql
-- Check table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='idempotency_keys';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename='idempotency_keys';
```

---

## 📊 What This Does

| Component | Purpose |
|-----------|---------|
| `idempotency_keys` table | Prevents duplicate orders from retries |
| `key` (PK) | Unique request fingerprint |
| `order_id` (FK) | Links to orders table |
| `response_json` | Cached API response for retries |
| Indexes | Fast lookups and cleanup of old entries |

---

## ⏱️ Timing
- Execution time: < 1 second
- Downtime: None (non-blocking operation)
- Effect: Immediate - orders will work after migration

---

## 🚨 If Migration Fails

### Error: "table already exists"
→ Safe to ignore - table already created

### Error: "foreign key constraint failed"
→ Contact: Make sure `public.orders` table exists (it should)

### Error: "permission denied"
→ Make sure you're using role with schema edit permissions

---

**Status**: ⏳ BLOCKING - Customer orders cannot be placed until this runs
**Action**: Execute SQL migration immediately in Supabase SQL Editor
