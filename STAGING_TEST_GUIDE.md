# 🧪 STEP 2: Staging Test Guide - Correct API Endpoints

## ⚠️ IMPORTANT: Routes Don't Use `/api/` Prefix

The API routes are registered directly, NOT under `/api/`:

| Endpoint | OLD (Wrong) | NEW (Correct) |
|----------|-----------|---------------|
| Courier Orders | `/api/courier/orders` ❌ | `/courier/orders` ✅ |
| Next Order | `/api/courier/orders/next` ❌ | `/courier/orders/next` ✅ |
| Accept Order | `/api/courier/order/{id}/accept` ❌ | `/courier/order/{id}/accept` ✅ |

---

## 🔑 Test Requirements

Before running tests, you need:
1. **Valid JWT token** for authenticated routes
2. **Courier role** assigned in database
3. **Orders assigned** to courier (status='ASSIGNED')

---

## 📝 Test Scenario: Idempotency + Next Order Feature

### **Test 1: Get Assigned Orders**

```bash
curl -X GET http://localhost:3000/courier/orders \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "order-uuid",
    "orderNumber": 12345,
    "orderStatus": "ASSIGNED",
    "deliveryStage": "GOING_TO_RESTAURANT",
    "courierAssignmentStatus": "ASSIGNED",
    "total": 85000,
    "deliveryFee": 15000,
    "restaurantName": "Turon Cafe",
    "customerName": "Alisher"
  }
]
```

**What This Tests:**
- ✅ Backend is running
- ✅ Authentication works
- ✅ Courier can fetch assigned orders

---

### **Test 2: Get Next Available Order (NEW FEATURE)**

```bash
curl -X GET http://localhost:3000/courier/orders/next \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN"
```

**Expected Response (if orders exist):**
```json
{
  "order": {
    "id": "order-uuid",
    "orderNumber": 12346,
    "deliveryStage": "GOING_TO_RESTAURANT",
    "courierAssignmentStatus": "ASSIGNED",
    "total": 92000,
    "deliveryFee": 15000,
    "customerName": "Yasmin",
    "destinationAddress": "123 Main Street, Tashkent"
  }
}
```

**Expected Response (if no orders):**
```json
{
  "noOrdersAvailable": true
}
```

**What This Tests:**
- ✅ New `/courier/orders/next` endpoint works
- ✅ Returns FIRST assigned order (FIFO - oldest first)
- ✅ Handles no-orders scenario gracefully

---

### **Test 3: Accept Courier Order (Idempotency)**

```bash
# First request
curl -X POST http://localhost:3000/courier/order/ORDER_ID/accept \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN" \
  -H "Idempotency-Key: unique-key-123"

# Retry with SAME key (should get same response, no error)
curl -X POST http://localhost:3000/courier/order/ORDER_ID/accept \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN" \
  -H "Idempotency-Key: unique-key-123"
```

**Expected Response (both requests):**
```json
{
  "success": true,
  "message": "Order accepted",
  "orderStatus": "ACCEPTED"
}
```

**What This Tests:**
- ✅ Idempotency keys table exists
- ✅ Duplicate requests return same response (no duplicate orders)
- ✅ No "table does not exist" error

---

### **Test 4: Order Delivery Stage Progression**

```bash
# Accept order
curl -X POST http://localhost:3000/courier/order/ORDER_ID/accept \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN"

# Arrive at restaurant
curl -X POST http://localhost:3000/courier/order/ORDER_ID/arrived-restaurant \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN"

# Pickup order
curl -X POST http://localhost:3000/courier/order/ORDER_ID/pickup \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN"

# Start delivery
curl -X POST http://localhost:3000/courier/order/ORDER_ID/start-delivery \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN"

# Arrive at destination
curl -X POST http://localhost:3000/courier/order/ORDER_ID/arrive-destination \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN"

# Deliver order
curl -X POST http://localhost:3000/courier/order/ORDER_ID/deliver \
  -H "Authorization: Bearer YOUR_COURIER_JWT_TOKEN"
```

**Expected:** Each stage succeeds, then shows celebration UI in frontend

**What This Tests:**
- ✅ Full delivery flow works
- ✅ Location permission prompt appears in app
- ✅ "Keyingi buyurtma" button triggers `/courier/orders/next`
- ✅ DeliveryCompletedPanel shows celebration screen

---

## 📱 Frontend Integration Test

**To verify location permission + next order:**

1. **Open courier app** in Telegram Mini App
2. **Location permission prompt** should appear
3. **Grant permission** → Should show ✅ checkmark
4. **Complete delivery** → Should show celebration UI
5. **Click "Keyingi buyurtma"** → Should fetch next order from `/courier/orders/next`
6. **New order map** should appear

---

## ✅ Success Criteria Checklist

| Check | Expected | Status |
|-------|----------|--------|
| `/courier/orders` returns orders | ✅ Yes | ? |
| `/courier/orders/next` returns next order | ✅ Yes | ? |
| Idempotency key prevents duplicates | ✅ No 404 error | ? |
| Location permission shows on app load | ✅ Modal appears | ? |
| Delivery completion shows celebration | ✅ Confetti + stats | ? |
| Next order button fetches new order | ✅ New map appears | ? |

---

## 🔧 Quick Fix: Get JWT Token

If you need a test token, run on AWS:

```bash
# Get your user ID
psql your-db-url -c "SELECT id, role, fullName FROM users WHERE role='COURIER' LIMIT 1;"

# Generate token (using your backend's token generation)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": YOUR_TELEGRAM_ID
  }'
```

---

**Next Step:** Run tests and report results! 🚀
