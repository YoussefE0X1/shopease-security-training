import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getMongoUri, stopEmbeddedMongo } from '../config/embeddedMongo';
import Challenge from '../modules/challenges/challenge.model';

dotenv.config();

// Catalog of the intentional flaws shipped in this application.
// Scope: Broken Access Control (BOLA/BFLA/BOPLA) + Business Logic + Mass Assignment.
// Everything else (injection, XSS, JWT, SSRF, ...) is fixed — the app behaves
// like a real hardened production site whose remaining bugs are authorization
// and logic ones. No flags, no points.
const challenges = [
  // ===== BAC — BOLA (horizontal object-level) =====
  {
    key: 'idor-read-order',
    name: 'IDOR — Read Any Order (PII Disclosure)',
    description:
      'Read any order by id. GET /api/orders/:id fetches the order without an ' +
      'ownership check, and the response includes the buyer\'s full name, email ' +
      'and shipping address. Order ids are MongoDB ObjectIds (timestamp-prefixed), ' +
      'so they are enumerable.',
    category: 'bac',
    difficulty: 3,
    challengeType: 'grey-box',
    tags: ['idor', 'bola', 'pii'],
    owaspCategory: 'API1:2023 – BOLA',
    cwe: 'CWE-639',
    endpoint: 'GET /api/orders/:id',
    httpMethod: 'GET',
  },
  {
    key: 'idor-personal-coupon',
    name: 'IDOR — Predictable Personal Coupon Codes',
    description:
      'Personal coupons are issued with a predictable pattern PERSONAL-<userId> and are ' +
      'never bound to their owner. Enumerate a user id and redeem their personal ' +
      'discount on your own order.',
    category: 'bac',
    difficulty: 3,
    challengeType: 'black-box',
    tags: ['idor', 'coupon', 'enumerable'],
    owaspCategory: 'API1:2023 – BOLA',
    cwe: 'CWE-639',
    endpoint: 'POST /api/orders',
    httpMethod: 'POST',
  },
  {
    key: 'idor-address',
    name: 'IDOR — Update/Delete Any User\'s Address',
    description:
      'The address endpoints look the address up by id across ALL users — the owner is ' +
      'never compared with the caller. Any authenticated user can edit or delete any ' +
      'other user\'s shipping address.',
    category: 'bac',
    difficulty: 2,
    challengeType: 'black-box',
    tags: ['idor', 'address'],
    owaspCategory: 'API1:2023 – BOLA',
    cwe: 'CWE-639',
    endpoint: 'PATCH /api/users/addresses/:addressId',
    httpMethod: 'PATCH, DELETE',
  },
  {
    key: 'idor-profile-cart',
    name: 'IDOR — Trusted userId Query Parameter (Profile + Cart)',
    description:
      'The profile and cart endpoints accept an optional userId query parameter that ' +
      'overrides the caller\'s identity. Any user can read any user\'s full profile ' +
      '(name, email, addresses, wishlist) and shopping cart.',
    category: 'bac',
    difficulty: 2,
    challengeType: 'black-box',
    tags: ['idor', 'profile', 'cart', 'query-param'],
    owaspCategory: 'API1:2023 – BOLA',
    cwe: 'CWE-639',
    endpoint: 'GET /api/users/profile?userId=',
    httpMethod: 'GET',
  },
  {
    key: 'idor-notification',
    name: 'IDOR — Mark Any User\'s Notification as Read',
    description:
      'Notifications carry a sequential public number (nid) that appears in every ' +
      'user\'s own notification list — the victim\'s ID is directly observable from ' +
      'legitimate access, no guessing needed. PATCH /api/notifications/:nid/read ' +
      'looks the notification up by nid with no ownership check, so any authenticated ' +
      'user can mark any other user\'s notification as read. The only flaw involved ' +
      'is the missing ownership check.',
    category: 'bac',
    difficulty: 2,
    challengeType: 'grey-box',
    tags: ['idor', 'notification', 'inconsistent'],
    owaspCategory: 'API1:2023 – BOLA',
    cwe: 'CWE-639',
    endpoint: 'PATCH /api/notifications/:nid/read',
    httpMethod: 'PATCH',
  },
  {
    key: 'idor-delete-review',
    name: 'IDOR — Delete Any Review',
    description:
      'DELETE /api/reviews/:id has no ownership check — any authenticated user can ' +
      'delete any review, wiping a competitor\'s (or any product\'s) rating history.',
    category: 'bac',
    difficulty: 1,
    challengeType: 'black-box',
    tags: ['idor', 'review', 'destructive'],
    owaspCategory: 'API1:2023 – BOLA',
    cwe: 'CWE-639',
    endpoint: 'DELETE /api/reviews/:id',
    httpMethod: 'DELETE',
  },

  // ===== BAC — BOPLA (property-level) =====
  {
    key: 'bopla-cost-price',
    name: 'BOPLA — Internal Product Fields Leak (costPrice, internalNotes)',
    description:
      'The public product API returns internal-only fields: costPrice (unit cost — ' +
      'exposes the margin) and internalNotes (supplier renegotiation notes). The server ' +
      'never strips properties before serialization.',
    category: 'bac',
    difficulty: 2,
    challengeType: 'white-box',
    tags: ['bopla', 'data-exposure', 'internal-fields'],
    owaspCategory: 'API3:2023 – BOPLA',
    cwe: 'CWE-668',
    endpoint: 'GET /api/products',
    httpMethod: 'GET',
  },
  {
    key: 'bopla-profile-fields',
    name: 'BOPLA — Profile Leaks refreshToken + internalNotes',
    description:
      'GET /api/users/profile explicitly selects fields marked select:false — the user\'s ' +
      'refreshToken (session hijack material) and internalNotes (fraud/chargeback flags) ' +
      'are returned. Chain with the userId IDOR for full account takeover.',
    category: 'bac',
    difficulty: 3,
    challengeType: 'white-box',
    tags: ['bopla', 'session-hijack', 'chain'],
    owaspCategory: 'API3:2023 – BOPLA',
    cwe: 'CWE-200',
    endpoint: 'GET /api/users/profile',
    httpMethod: 'GET',
  },

  // ===== BAC — BFLA (function-level) =====
  {
    key: 'bfla-admin-stats',
    name: 'BFLA — Admin Dashboard Stats Without Role Check',
    description:
      'GET /api/admin/stats has no role check at all — revenue, order counts, monthly ' +
      'revenue and top products are readable by any authenticated user, while the rest ' +
      'of the admin surface is protected (inconsistent authorization).',
    category: 'bac',
    difficulty: 2,
    challengeType: 'grey-box',
    tags: ['bfla', 'admin', 'inconsistent'],
    owaspCategory: 'API5:2023 – BFLA',
    cwe: 'CWE-862',
    endpoint: 'GET /api/admin/stats',
    httpMethod: 'GET',
  },
  {
    key: 'bfla-product-crud',
    name: 'BFLA — Product CRUD by Any User',
    description:
      'Product create/update/delete routes dropped their admin guard. Any authenticated ' +
      'user can change prices, stock levels or delete catalog items.',
    category: 'bac',
    difficulty: 2,
    challengeType: 'black-box',
    tags: ['bfla', 'products', 'price-tampering'],
    owaspCategory: 'API5:2023 – BFLA',
    cwe: 'CWE-862',
    endpoint: 'PATCH /api/products/:id',
    httpMethod: 'PATCH',
  },
  {
    key: 'bfla-coupon-crud',
    name: 'BFLA — Coupon CRUD by Any User',
    description:
      'Coupon create/list/delete routes dropped their admin guard. Any user can invent ' +
      'coupons (e.g. 90% off, unlimited usage) or delete the existing ones.',
    category: 'bac',
    difficulty: 2,
    challengeType: 'black-box',
    tags: ['bfla', 'coupons', 'discount'],
    owaspCategory: 'API5:2023 – BFLA',
    cwe: 'CWE-862',
    endpoint: 'POST /api/coupons',
    httpMethod: 'POST',
  },
  {
    key: 'bfla-user-management',
    name: 'BFLA — User Management by Any User (list / role / delete)',
    description:
      'GET /api/users dumps every account (PII), PATCH /api/users/:id/role lets anyone ' +
      'promote themselves or demote others, and DELETE /api/users/:id lets anyone delete ' +
      'any account. Only the protected primary admin is exempt.',
    category: 'bac',
    difficulty: 3,
    challengeType: 'black-box',
    tags: ['bfla', 'pii', 'privesc', 'account-takeover'],
    owaspCategory: 'API5:2023 – BFLA',
    cwe: 'CWE-862',
    endpoint: 'GET /api/users',
    httpMethod: 'GET, PATCH, DELETE',
  },
  {
    key: 'bfla-stale-token-role',
    name: 'BFLA — Stale Token Role (Incomplete Revocation)',
    description:
      'GET /api/admin/export trusts the role claim inside the JWT instead of re-reading ' +
      'the current database role. A user who was demoted (or whose account was deleted) ' +
      'keeps exporting every order until the 7-day token expires. ' +
      'Chain: promote a test user, then demote them, and keep using the old token.',
    category: 'bac',
    difficulty: 4,
    challengeType: 'white-box',
    tags: ['bfla', 'stale-role', 'revocation', 'chain'],
    owaspCategory: 'API5:2023 – BFLA',
    cwe: 'CWE-613',
    endpoint: 'GET /api/admin/export',
    httpMethod: 'GET',
  },

  // ===== Business Logic =====
  {
    key: 'logic-trust-client-price',
    name: 'Logic — Client-Supplied Price Trusted',
    description:
      'addToCart accepts a price field from the client and uses it as-is instead of the ' +
      'catalog price. Add an item with "price": 0.01 and checkout pays one cent.',
    category: 'logic',
    difficulty: 2,
    challengeType: 'black-box',
    tags: ['price-tampering', 'logic-flaw', 'ecommerce'],
    owaspCategory: 'A04:2021 – Insecure Design',
    cwe: 'CWE-840',
    endpoint: 'POST /api/cart/items',
    httpMethod: 'POST',
  },
  {
    key: 'logic-trust-discount-shipping',
    name: 'Logic — Client-Controlled Discount / Shipping / Coupon Stacking',
    description:
      'createOrder honors a client-supplied discount and shippingCost instead of ' +
      'recomputing them — set discount >= subtotal for a free order, or a negative ' +
      'shippingCost. The endpoint also accepts an array of coupons and sums every ' +
      'discount (coupon stacking) even when the coupons were meant to be used alone.',
    category: 'logic',
    difficulty: 3,
    challengeType: 'grey-box',
    tags: ['price-tampering', 'coupon-stacking', 'free-order'],
    owaspCategory: 'A04:2021 – Insecure Design',
    cwe: 'CWE-840',
    endpoint: 'POST /api/orders',
    httpMethod: 'POST',
  },
  {
    key: 'logic-toc-tou-coupon',
    name: 'Logic — TOCTOU Coupon Over-Use (Race)',
    description:
      'The coupon usedCount check-then-increment is not atomic, and the simulated ' +
      'payment-gateway window (~150ms) sits between them. Fire concurrent checkouts ' +
      'with the same single-use coupon: every request passes the check before any ' +
      'increments — the coupon is redeemed many times.',
    category: 'logic',
    difficulty: 4,
    challengeType: 'grey-box',
    tags: ['race', 'toc-tou', 'coupon', 'concurrency'],
    owaspCategory: 'A04:2021 – Insecure Design',
    cwe: 'CWE-362',
    endpoint: 'POST /api/orders',
    httpMethod: 'POST',
  },
  {
    key: 'logic-toc-tou-stock',
    name: 'Logic — TOCTOU Stock Oversell (Negative Inventory)',
    description:
      'The stock check happens before the payment-gateway window and the decrement after ' +
      'it. Concurrent orders for the same product all pass the check, then each ' +
      'decrements — stock goes negative and the seller oversells.',
    category: 'logic',
    difficulty: 4,
    challengeType: 'grey-box',
    tags: ['race', 'toc-tou', 'stock', 'oversell'],
    owaspCategory: 'A04:2021 – Insecure Design',
    cwe: 'CWE-362',
    endpoint: 'POST /api/orders',
    httpMethod: 'POST',
  },
  {
    key: 'logic-double-submit',
    name: 'Logic — Double-Submit Checkout (No Idempotency)',
    description:
      'The cart is cleared AFTER the order is created. Two concurrent checkouts both ' +
      'read the same cart before either clears it — the customer receives two identical ' +
      'orders (or the attacker abuses it to duplicate).',
    category: 'logic',
    difficulty: 3,
    challengeType: 'grey-box',
    tags: ['idempotency', 'double-submit', 'race'],
    owaspCategory: 'A04:2021 – Insecure Design',
    cwe: 'CWE-841',
    endpoint: 'POST /api/orders',
    httpMethod: 'POST',
  },
  {
    key: 'logic-cancel-race',
    name: 'Logic — Cancel Race (Double Refund / Stock Restore)',
    description:
      'Cancelling an order is a read-check-write transition with no atomic guard. Two ' +
      'concurrent cancels both read "pending", both proceed — the order is refunded and ' +
      'the stock restored TWICE for a single order.',
    category: 'logic',
    difficulty: 4,
    challengeType: 'grey-box',
    tags: ['race', 'refund', 'stock', 'state-machine'],
    owaspCategory: 'A04:2021 – Insecure Design',
    cwe: 'CWE-362',
    endpoint: 'PATCH /api/orders/:id/cancel',
    httpMethod: 'PATCH',
  },
  {
    key: 'logic-quantity-manipulation',
    name: 'Logic — Negative / Decimal Quantity Price Manipulation',
    description:
      'addToCart never validates quantity. A negative quantity makes the cart total ' +
      'negative (the checkout clamps to zero — a free order that also RESTORES stock ' +
      'via the decrement), and decimal quantities like 0.5 pay half price.',
    category: 'logic',
    difficulty: 2,
    challengeType: 'black-box',
    tags: ['quantity', 'price-tampering', 'negative'],
    owaspCategory: 'A04:2021 – Insecure Design',
    cwe: 'CWE-840',
    endpoint: 'POST /api/cart/items',
    httpMethod: 'POST',
  },
  {
    key: 'logic-session-invalidation',
    name: 'Logic — Incomplete Session Invalidation + Refresh Rotation Race',
    description:
      'logout only clears the refresh token — the access token stays valid until its ' +
      '7-day expiry, so a "logged out" session keeps working. The refresh endpoint also ' +
      'has a rotation race: two concurrent refreshes with the same token both succeed, ' +
      'so an old stolen token is never truly revoked.',
    category: 'logic',
    difficulty: 3,
    challengeType: 'white-box',
    tags: ['session', 'logout', 'refresh', 'revocation'],
    owaspCategory: 'A04:2021 – Insecure Design',
    cwe: 'CWE-613',
    endpoint: 'POST /api/auth/logout',
    httpMethod: 'POST',
  },

  // ===== Mass Assignment (separate category) =====
  {
    key: 'mass-assignment-register',
    name: 'Mass Assignment — Role Escalation at Registration',
    description:
      'POST /api/auth/register passes the whole request body to User.create. Send ' +
      '{"role": "admin"} (or isActive, phone, ...) and register as an administrator.',
    category: 'mass-assignment',
    difficulty: 2,
    challengeType: 'black-box',
    tags: ['mass-assignment', 'privesc'],
    owaspCategory: 'API6:2023 – Mass Assignment',
    cwe: 'CWE-915',
    endpoint: 'POST /api/auth/register',
    httpMethod: 'POST',
  },
  {
    key: 'mass-assignment-profile',
    name: 'Mass Assignment — Profile Update Escalation',
    description:
      'PATCH /api/users/profile assigns the request body onto the user document. Only ' +
      'technical identifiers are blocked — role, email, phone and isActive are ' +
      'attacker-settable: promote yourself to admin or hijack the account email.',
    category: 'mass-assignment',
    difficulty: 2,
    challengeType: 'black-box',
    tags: ['mass-assignment', 'privesc', 'email-takeover'],
    owaspCategory: 'API6:2023 – Mass Assignment',
    cwe: 'CWE-915',
    endpoint: 'PATCH /api/users/profile',
    httpMethod: 'PATCH',
  },
  {
    key: 'mass-assignment-order',
    name: 'Mass Assignment — Order Created as "Paid"',
    description:
      'createOrder takes paymentStatus/orderStatus from the request body. Send ' +
      '{"paymentStatus": "paid"} and the order is recorded as paid without any ' +
      'payment — plus trust-client discount/shipping for a free order.',
    category: 'mass-assignment',
    difficulty: 3,
    challengeType: 'grey-box',
    tags: ['mass-assignment', 'payment', 'free-order'],
    owaspCategory: 'API6:2023 – Mass Assignment',
    cwe: 'CWE-915',
    endpoint: 'POST /api/orders',
    httpMethod: 'POST',
  },
];

export const run = async () => {
  try {
    await mongoose.connect(await getMongoUri());
    console.log('Connected to MongoDB');

    await Challenge.deleteMany({});
    await Challenge.insertMany(challenges as any);
    console.log(`Seeded ${challenges.length} challenges`);

    await mongoose.disconnect();
    await stopEmbeddedMongo();
    console.log('Done');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

// Auto-run only when executed directly (npm run seed:challenges), not when
// imported by reset.seed.ts
if (require.main === module) {
  run();
}
