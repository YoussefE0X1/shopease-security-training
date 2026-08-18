# ShopEase — Access-Control & Business-Logic Training Platform

> Full-stack e-commerce platform (Node.js / Express / TypeScript / MongoDB + React 19 / Vite / Tailwind) that looks and behaves like **hardened production code** — except for a deliberate, documented set of flaws in **Broken Access Control**, **Business Logic** and **Mass Assignment**.

---

## Table of Contents

- [1. Quick Start](#1-quick-start)
- [2. Architecture](#2-architecture)
- [3. API Endpoints](#3-api-endpoints)
- [4. What Is Deliberately Broken](#4-what-is-deliberately-broken)
- [5. Flaw Catalog (24)](#5-flaw-catalog-24)
  - [5.1 Broken Access Control (13)](#51-broken-access-control-13)
  - [5.2 Business Logic (8)](#52-business-logic-8)
  - [5.3 Mass Assignment (3)](#53-mass-assignment-3)
- [6. Chain Ideas](#6-chain-ideas)
- [7. Seed Data & Reset](#7-seed-data--reset)

---

## 1. Quick Start

```bash
npm install          # backend
cd client && npm install && cd ..
npm run dev:all      # backend :5000 + client :5173 (embedded MongoDB)
```

Seed accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@shop.com | admin123 | admin |
| john@test.com | user123 | customer |

The catalog lives in the app under **Challenges** (`/challenges`) and is served by `GET /api/challenges`.

---

## 2. Architecture

```
src/
├── index.ts                       # Express app entry
├── config/                        # env + embedded MongoDB
├── modules/
│   ├── auth/                      # register / login / refresh / logout / change-password
│   ├── users/                     # profile, addresses, admin user management
│   ├── products/                  # product CRUD (public catalog + BFLA)
│   ├── categories/
│   ├── cart/                      # cart ops (trusted client price/quantity)
│   ├── orders/                    # checkout + cancel (TOCTOU / trust / stacking)
│   ├── reviews/                   # reviews (IDOR delete, always-escaped)
│   ├── coupons/                   # coupon CRUD + validation (BFLA)
│   ├── notifications/             # notifications (IDOR read)
│   ├── admin/                     # stats (BFLA) + export (stale-token role)
│   └── challenges/                # catalog API
└── shared/middleware/             # auth (JWT + DB role check), validate, errors
```

No security-level system, no flags, no scoring — the app has exactly one behavior, and every deliberate flaw is documented below.

---

## 3. API Endpoints

### Auth `/api/auth`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| POST | `/register` | Public | **Mass Assignment** (role escalation) |
| POST | `/login` | Public | bcrypt, constant-ish behavior |
| POST | `/refresh` | Public | token rotation with a race |
| POST | `/logout` | Auth | only clears the refresh token |
| GET | `/me` | Auth | current user |
| POST | `/change-password` | Auth | requires current password |

### Users `/api/users`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/profile` | Auth | **IDOR** via `?userId=` + **BOPLA** fields |
| PATCH | `/profile` | Auth | **Mass Assignment** |
| POST/PATCH/DELETE | `/addresses...` | Auth | **IDOR** (global address lookup) |
| POST | `/wishlist/:productId` | Auth | |
| GET | `/` | Auth | **BFLA** user list (PII) |
| PATCH | `/:id/role` | Auth | **BFLA** role change |
| DELETE | `/:id` | Auth | **BFLA** user deletion |

### Products `/api/products`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/`, `/featured`, `/slug/:slug`, `/:id` | Public | **BOPLA** (costPrice, internalNotes) |
| POST/PATCH/DELETE | `/`, `/:id` | Auth | **BFLA** product CRUD |

### Cart `/api/cart`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/` | Auth | **IDOR** via `?userId=` |
| POST | `/items` | Auth | trusts client `price` + unvalidated `quantity` |
| PATCH/DELETE | `/items/:itemId`, `/` | Auth | |

### Orders `/api/orders`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| POST | `/` | Auth | trust discount/shipping, coupon stacking, TOCTOU, double-submit, mass-assignment payment |
| GET | `/mine` | Auth | scoped |
| GET | `/:id` | Auth | **IDOR** (PII) |
| PATCH | `/:id/cancel` | Auth | cancel race |
| PATCH | `/:id/status` | Auth | **BFLA** order status |

### Reviews `/api/reviews`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/:productId` | Public | escaped |
| POST | `/:productId` | Auth | escaped |
| DELETE | `/:id` | Auth | **IDOR** (no ownership check) |

### Coupons `/api/coupons`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET/POST | `/`, `/validate`, DELETE `/:id` | Auth | **BFLA** CRUD + **IDOR** personal codes |

### Notifications `/api/notifications`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/` | Auth | scoped |
| PATCH | `/:id/read` | Auth | **IDOR** (not scoped) |
| PATCH | `/read-all` | Auth | scoped |

### Admin `/api/admin`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/stats` | Auth | **BFLA** — no role check |
| GET | `/export` | Auth | **BFLA** stale-token role |

### Challenges `/api/challenges`
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/` | Auth | catalog |
| GET | `/:key` | Auth | single entry |

---

## 4. What Is Deliberately Broken

The flaws fall into three families, mirroring the three most-reported categories in real API security reviews (OWASP API Security Top 10 2023):

1. **BAC** — Broken Object Level Authorization (IDOR), Broken Function Level Authorization (BFLA), Broken Object Property Level Authorization (BOPLA).
2. **Business Logic** — flaws in the order/cart/coupon state machines that no library will ever fix for you: trusting the client, TOCTOU races, missing idempotency, unvalidated transitions.
3. **Mass Assignment** — the whole request body ends up in MongoDB documents.

Every flaw is annotated in the source code with a `// VULNERABILITY (...)` comment naming the catalog key, so white-box work is straightforward.

---

## 5. Flaw Catalog (24)

### 5.1 Broken Access Control (13)

#### BAC-01 · IDOR — Read Any Order (PII Disclosure)
- **Endpoint** `GET /api/orders/:id` · **CWE-639 / API1:2023 BOLA**
- The order is fetched by its public number without an ownership check. The response includes the buyer's name, email and shipping address.
- The order number is the buyer's email in Base64URL (no padding) — no guessing or enumeration needed: the buyer's own order notification shows it.

#### BAC-02 · IDOR — Predictable Personal Coupon Codes
- **Endpoint** `POST /api/orders` · **CWE-639 / API1:2023 BOLA**
- Personal coupons are generated with a predictable pattern `PERSONAL-<userId>` and are never bound to their owner. Enumerate a user id and redeem their personal discount.

#### BAC-03 · IDOR — Update/Delete Any User's Address
- **Endpoints** `PATCH /api/users/addresses/:addressId`, `DELETE /api/users/addresses/:addressId` · **CWE-639**
- Addresses are looked up by id across **all** users; the caller's identity is never compared.

#### BAC-04 · IDOR — Trusted `userId` Query Parameter (Profile + Cart)
- **Endpoints** `GET /api/users/profile?userId=`, `GET /api/cart?userId=` · **CWE-639**
- An optional `userId` query parameter overrides the caller's identity: full profiles and carts of any user are readable.

#### BAC-05 · IDOR — Mark Any User's Notification as Read
- **Endpoint** `PATCH /api/notifications/:nid/read` · **CWE-639**
- Notifications carry a sequential public number (`nid`) that appears in every user's own notification list — the victim's ID is directly observable from legitimate access, no guessing needed. The mark-as-read endpoint looks the notification up by `nid` with no ownership check: any authenticated user can mark any other user's notification as read. The only flaw involved is the missing ownership check.

#### BAC-06 · IDOR — Delete Any Review
- **Endpoint** `DELETE /api/reviews/:id` · **CWE-639**
- No ownership check: any authenticated user can delete any review (rating manipulation).

#### BAC-07 · BOPLA — Internal Product Fields Leak
- **Endpoint** `GET /api/products` · **CWE-668 / API3:2023 BOPLA**
- The public API returns `costPrice` (unit cost → margin) and `internalNotes` (supplier renegotiation notes). Nothing strips properties before serialization.

#### BAC-08 · BOPLA — Profile Leaks `refreshToken` + `internalNotes`
- **Endpoint** `GET /api/users/profile` · **CWE-200 / API3:2023 BOPLA**
- Explicit `.select()` re-includes `select:false` fields: the user's `refreshToken` (session hijack material) and `internalNotes` (fraud flags). Chain with BAC-04 for full account takeover.

#### BAC-09 · BFLA — Admin Dashboard Stats Without Role Check
- **Endpoint** `GET /api/admin/stats` · **CWE-862 / API5:2023 BFLA**
- No role check at all on `/stats` while the rest of the admin surface is protected — inconsistent authorization. Revenue, order counts and top products are readable by any user.

#### BAC-10 · BFLA — Product CRUD by Any User
- **Endpoints** `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id` · **CWE-862**
- The admin guard was dropped: anyone can change prices/stock or delete catalog items.

#### BAC-11 · BFLA — Coupon CRUD by Any User
- **Endpoints** `GET/POST /api/coupons`, `DELETE /api/coupons/:id` · **CWE-862**
- Anyone can invent coupons (e.g. 90% off, unlimited usage) or delete existing ones.

#### BAC-12 · BFLA — User Management by Any User (list / role / delete)
- **Endpoints** `GET /api/users`, `PATCH /api/users/:id/role`, `DELETE /api/users/:id` · **CWE-862 / API5:2023 BFLA**
- `GET /api/users` dumps every account (PII), role changes allow self-promotion to admin, and accounts can be deleted. Only the protected primary admin (`isProtected: true`) is exempt.

#### BAC-13 · BFLA — Stale Token Role (Incomplete Revocation)
- **Endpoint** `GET /api/admin/export` · **CWE-613**
- This endpoint trusts the `role` claim inside the JWT instead of re-reading the current database role. A demoted (or deleted) user keeps exporting every order until the 7-day token expires.
- **Chain:** promote a second account → log in → demote it → the old token still exports.

### 5.2 Business Logic (8)

#### LOG-01 · Trusted Client Price & Discount (5% Store Discount)
- **Endpoint** `POST /api/cart/items` · **CWE-840 / A04:2021**
- Every product shows a legitimate **5% store discount**. The normal add-to-cart request carries the discounted unit price and the `discountPercent` it displayed (`{"quantity": 2, "price": 55, "discountPercent": 5}`) — and the backend trusts both instead of re-deriving them from the catalog.
- **Attack:** browse a product → add to cart while intercepting → the request contains the legitimate values → raise `discountPercent` (5 → 90) or lower `price` → forward → the cart total drops → checkout → the tampered amount persists into the **server-side order total** (not just a display change).

#### LOG-02 · Client-Controlled Discount / Shipping / Coupon Stacking
- **Endpoint** `POST /api/orders` · **CWE-840 / A04:2021**
- The order honors client-supplied `discount` and `shippingCost` instead of recomputing them (negative shippingCost = seller pays you). The endpoint also accepts an **array** of coupons and sums every discount — stacking coupons that were meant to be used alone.

#### LOG-03 · TOCTOU Coupon Over-Use (Race)
- **Endpoint** `POST /api/orders` · **CWE-362 / A04:2021**
- `usedCount` check-then-increment is not atomic, and a simulated payment-gateway window (~150 ms) sits between them. Concurrent checkouts with the same single-use coupon all pass the check — the coupon is redeemed many times.

#### LOG-04 · TOCTOU Stock Oversell (Negative Inventory)
- **Endpoint** `POST /api/orders` · **CWE-362 / A04:2021**
- The stock check happens before the gateway window and the decrement after it. Concurrent orders all pass the check, then each decrements — stock goes negative and the seller oversells.

#### LOG-05 · Double-Submit Checkout (No Idempotency)
- **Endpoint** `POST /api/orders` · **CWE-841 / A04:2021**
- The cart is cleared **after** order creation. Two concurrent checkouts both read the same cart before either clears it — duplicate orders for one payment.

#### LOG-06 · Cancel Race (Double Refund / Stock Restore)
- **Endpoint** `PATCH /api/orders/:id/cancel` · **CWE-362 / A04:2021**
- Cancel is a read-check-write transition with no atomic guard: two concurrent cancels both read `pending`, both proceed — the order is refunded and stock restored twice.

#### LOG-07 · Negative / Decimal Quantity Price Manipulation
- **Endpoint** `POST /api/cart/items` · **CWE-840 / A04:2021**
- `quantity` is never validated. A negative quantity makes the cart total negative (clamped to a free order at checkout, which also *restores* stock via the decrement); `0.5` pays half price.

#### LOG-08 · Incomplete Session Invalidation + Refresh Rotation Race
- **Endpoints** `POST /api/auth/logout`, `POST /api/auth/refresh` · **CWE-613 / A04:2021**
- Logout only clears the refresh token — the access token stays valid for 7 days. The refresh endpoint has a rotation race: two concurrent refreshes with the same token both succeed, so a stolen token is never truly revoked.

### 5.3 Mass Assignment (3)

#### MA-01 · Role Escalation at Registration
- **Endpoint** `POST /api/auth/register` · **CWE-915 / API6:2023**
- The whole request body goes to `User.create`. Send `{"role": "admin"}` and register as an administrator.

#### MA-02 · Profile Update Escalation
- **Endpoint** `PATCH /api/users/profile` · **CWE-915 / API6:2023**
- The request body is assigned onto the user document. Only technical identifiers are blocked — `role`, `email`, `phone`, `isActive` are attacker-settable (self-promotion or email hijack).

#### MA-03 · Order Created as "Paid"
- **Endpoint** `POST /api/orders` · **CWE-915 / API6:2023**
- `paymentStatus`/`orderStatus` come straight from the body. Send `{"paymentStatus": "paid"}` and the order is recorded as paid with no payment — combine with LOG-02 for a free order.

---

## 6. Chain Ideas

The catalog is designed to chain, the way real attacks do:

1. **Full account takeover of any user:** BAC-04 (profile `?userId=`) → BAC-08 (`refreshToken` leak) → refresh endpoint → impersonate. Or BAC-12 → delete the target.
2. **Free shopping:** LOG-01 (cart price) or LOG-02 (discount/shipping) or LOG-07 (negative qty) → MA-03 (`paid`) → LOG-05/06 to also mess with history.
3. **Privilege escalation to admin:** MA-01 or MA-02 (`role: admin`) → then legitimately use every admin endpoint.
4. **Single-use coupon → many redemptions:** BAC-02 (someone else's `PERSONAL-*`) + LOG-03 (race) + LOG-02 (stack it with others).
5. **PII + business intelligence:** BAC-01 (order dump) + BAC-09 (stats) + BAC-12 (user list) → full customer database.

## 7. Seed Data & Reset

```bash
npm run seed:data         # users, categories, products (with costPrice/internalNotes), coupons (incl. PERSONAL-*)
npm run seed:challenges   # the 24-entry catalog above
npm run seed:reset        # both + drop dynamic collections (carts, reviews, orders, notifications)
```

The seed scripts run against the same embedded MongoDB as the app (they stop it when done — restart the app afterwards with `npm run dev:all`).
