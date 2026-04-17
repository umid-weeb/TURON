# Supabase Database + AWS Backend Migration Guide

**Sizning Konfig:**
- 🗄️ Database: **Supabase** (hosted)
- 🖥️ Backend: **AWS** (deployed)

---

## ✅ Eng Tez Usuli - Supabase Web Console

### **Qadam 1: Supabase Dashboardga Kiring**
1. [supabase.com](https://supabase.com) → Login
2. Sizning project tanlang
3. **SQL Editor** click qiling (chap tomonda)

### **Qadam 2: SQL Kopi-Paste Qiling**

Quyidagi SQL-ni SQL Editor-ga kopi qiling:

```sql
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
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_order_id_fkey" 
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### **Qadam 3: RUN qiling**
1. SQL Editor-da **RUN** tugmasini bosing (yoki Ctrl+Enter)
2. ✅ Success message koʻring

**Xolos!** Migration applied ✓

---

## Boshqa Opsiyalar

### **Opsion 2: AWS Backend-dan Prisma Bilan**

Agar AWS-da direct access bo'lsa:

```bash
# AWS Instance-da:
cd /app/backend

# .env faylida DATABASE_URL tekshiring (Supabase connection string)
cat .env | grep DATABASE_URL

# Migration apply qiling:
pnpm prisma migrate deploy
```

**Muammo**: `prisma migrate deploy` faqat local migrations-ni ko'radi. AWS-da migrations folder bo'lishi kerak.

### **Opsion 3: Supabase CLI Bilan (Local Mashina)**

Agar local mashina-da Supabase CLI o'rnatilgan bo'lsa:

```bash
# 1. Supabase CLI o'rnating
npm install -g supabase

# 2. Local setup:
cd supabase
supabase link --project-ref your_project_id

# 3. Push migration:
supabase db push

# 4. Tekshiring - Supabase Console-da table koʻrinadi
```

---

## 🎯 Tavsiya (Sizning Holatda)

**Supabase Database + AWS Backend uchun:**

### ✅ **BEST: Supabase Web Console**
- Noqulay: Hech qanday CLI kerak emas
- Tez: 1 minutada
- Xavfsiz: Direct Supabase console

### 🔄 **ALTERNATIVE: AWS Backend-dan Prisma**
```bash
# AWS-da terminal açing:
ssh ec2-user@your-aws-instance

# Backend folderiga kiring:
cd /path/to/backend

# DATABASE_URL check (Supabase connection string bo'lishi kerak):
echo $DATABASE_URL

# Migration apply:
npx prisma migrate deploy
```

---

## 🔍 Tekshirilishi

Qaysi usuli tanlasangiz ham, migration successful bo'lganini tekshiring:

### **Supabase Console-da:**
1. SQL Editor → Run:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'IdempotencyKey';
```

2. ✅ Agar table koʻrinsa - Migration OK!

### **Yoki psql bilan:**
```bash
psql -h db.XXXX.supabase.co -U postgres -d postgres -c "SELECT * FROM \"IdempotencyKey\" LIMIT 1;"
```

---

## 📋 Checklist

- [ ] Supabase Console-ga login
- [ ] SQL Editor-ni oching
- [ ] SQL-ni kopi-paste qiling (yuqoridagi SQL bloki)
- [ ] RUN qiling
- [ ] ✅ Success message koʻrish
- [ ] Backend qayta start (AWS-da)
- [ ] ✅ Kuryer app - yangi buyurtma test

---

## 🚨 Agar Muammo Bo'lsa

**Error: Table already exists**
```
ERROR: relation "IdempotencyKey" already exists
```
→ Jadval allaqachon mavjud. Darhol hech qilmang, hammasi OK.

**Error: Foreign key fail**
```
ERROR: relation "orders" does not exist
```
→ `orders` table mavjud emasligini tekshiring

**Error: Column undefined**
```
ERROR: column "order_id" does not exist
```
→ SQL-ni qaytadan tekshiring, toggle case.

---

## 📞 Agar Backend Qo'shma Kerak Bo'lsa

Backend-da schema syncing:
```bash
# AWS-da:
npx prisma generate  # Schema sync
npx prisma db push   # Bir xil migration
```

---

## ✨ Keyingi Qadam

1. ✅ Migration Supabase-ga apply qiling
2. ✅ Backend restart qiling (AWS-da)
3. ✅ Test: Kuryer yangi buyurtma qilib ko'ring
4. ✅ Hamma ishga tushinadi! 🎉

---

**Eng tez usul**: **Supabase Console SQL Editor** (Tavsiya!) ✅
