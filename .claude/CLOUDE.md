# TURON Project Memory (Claude Instructions)

## PROJECT OVERVIEW

TURON is a Telegram Mini App for a SINGLE restaurant food ordering and delivery system.

IMPORTANT:
- This is NOT a marketplace
- This is NOT multi-restaurant
- This is a single restaurant system

The system includes:
- Customer ordering experience
- Admin management panel
- Courier delivery system

The app must be simple, fast, and usable by real everyday users in Uzbekistan.

---

## CORE PRODUCT IDEA

This is a real production product, not a demo.

Goal:
Create a reliable, scalable, and user-friendly food delivery system inside Telegram Mini App.

Focus:
- Real users
- Real orders
- Real delivery flow
- Real-time usability

---

## USER ROLES

### 1. Customer
- Browse menu
- Add products to cart
- Checkout
- Select address via map (Yandex)
- Track order status

### 2. Admin
- Manage menu and categories
- Manage orders
- Manage promo codes
- Monitor operations

### 3. Courier
- Accept orders
- Navigate via map
- Pickup from restaurant
- Deliver to customer exact location
- Update delivery status

---

## TECH STACK

- Monorepo: pnpm workspaces

### Frontend:
- React + Vite (Telegram Mini App)

### Backend:
- Node.js (Fastify)
- Telegraf (Telegram Bot)

### Database:
- PostgreSQL (Supabase)
- Prisma ORM

### Deployment:
- Frontend → Vercel
- Backend → Railway

### Maps:
- Yandex Maps APIs (map, geocoder, routing)

---

## REPOSITORY STRUCTURE

- apps/miniapp → frontend
- apps/backend → backend + bot
- packages/shared → shared types/constants

---

## PRODUCT SCOPE

### CUSTOMER SIDE (MAIN PRIORITY)
`- Home page (restaurant intro)
- Category list
- Product cards
- Cart system
- Checkout flow
- Promo code support
- Address selection (map + saved addresses)
- Order creation
- Order history
- Order detail page
- Order tracking UI

---

### ADMIN SIDE

- Menu management
- Category management
- Promo management
- Orders dashboard
- Courier coordination

---

### COURIER SIDE

- Courier-only access
- Orders list
- Order detail
- Route to restaurant
- Pickup confirmation
- Route to customer (exact pin)
- Delivery confirmation
- Status updates

---

## BUSINESS RULES (CRITICAL)

- Customer-selected map pin MUST be exact and reused for delivery
- No fake/mock data in production (only temporary)
- All important data must come from backend/database
- Delivery fee must be calculated correctly
- Payment must not rely on fake frontend success
- Role separation must be strict (customer/admin/courier)

---

## UX PRINCIPLES

- Mobile-first design
- Simple and intuitive UI
- No unnecessary complexity
- No empty or confusing screens
- Important actions must be obvious

Language:
- Uzbek-first UI
Examples:
- Savat
- Tasdiqlash
- To'lov usuli
- Yetkazish manzili

---

## KNOWN FRAGILE AREAS

- Telegram WebApp URL (can become stale)
- Vercel routing (404 issues)
- Environment variables (VITE_*)
- Backend URL / CORS issues
- Role routing logic
- Supabase vs local data mismatch
- Map/address flow
- Courier flow consistency

---

## DEVELOPMENT RULES

ALWAYS:

- Analyze before coding
- Make minimal safe changes
- Keep code modular and clean
- Clearly identify affected layers:
  - frontend
  - backend
  - database
  - deployment
  - env
  - routing
  - bot

---

## DEBUGGING RULES

Always determine:

- Is it frontend issue?
- Is it backend issue?
- Is it deployment issue?
- Is it Telegram URL issue?
- Is it environment variable issue?

---

## WORKFLOW (MANDATORY)

1. Restate the task
2. Identify affected files
3. Identify root cause
4. Propose solution
5. Implement ONLY scoped changes
6. Report changes
7. Report testing
8. Report risks

---

## DO NOT DO THESE

- Do NOT treat TURON as marketplace
- Do NOT redesign unrelated parts
- Do NOT break role logic
- Do NOT replace map pin with vague address
- Do NOT leave pages empty
- Do NOT do large refactors without request
- Do NOT code without analysis

---

## CURRENT PROJECT GOAL

1. Fully understand the repository
2. Stabilize existing system
3. Focus on CUSTOMER PANEL first
4. Bring it to PRODUCTION LEVEL quality
5. Then improve other parts step by step![alt text](image.png)