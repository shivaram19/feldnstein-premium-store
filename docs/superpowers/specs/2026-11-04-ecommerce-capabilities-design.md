# E-commerce capabilities — cart, orders, payments, integration

Date: 2026-11-04. Scope: end-to-end selling on top of the gaanugu inventory.

## Principle

Orders sell **gaanugu variants** (`ProductVariant`) priced by active `PriceConfig`
(SELLING), fulfilled from `StockLevel` positions, with every stock mutation written to
the `StockMovement` ledger (existing Transaction Ledger screen shows them). One connected
data model: catalog → price → stock → order → payment → ledger.

## Backend (new packages `commerce.cart`, `commerce.order`, `commerce.payment`)

Flyway `V9__commerce_schema.sql`:
- `cart` (token uuid, created_at, expires_at), `cart_item` (cart_id, variant_id, qty,
  unit_price, gst_pct — price snapshots)
- `customer_order` (order_code unique ORD-…, customer_name, email, phone, address,
  city, state, pincode, status, sub_total, gst_total, grand_total, timestamps)
  status: PENDING → PAID → CONFIRMED → SHIPPED → DELIVERED; CANCELLED from
  PENDING/PAID/CONFIRMED
- `order_line` (order_id, variant_id, qty, unit_price, gst_pct, line_total)
- `payment` (order_id, provider DEMO/RAZORPAY, provider_ref, amount, status
  INITIATED/PAID/FAILED/REFUNDED, raw_json, timestamps)

Public API (`@PermitAll`, anonymous via `X-Cart-Token` header, 24h cart TTL):
- `GET /shop/cart` · `POST /shop/cart/items` {variantId, qty} ·
  `PUT /shop/cart/items/{variantId}` {qty} · `DELETE /shop/cart/items/{variantId}`
- `POST /shop/checkout` {name,email,phone,address,city,state,pincode} → order +
  payment initiation; reserves stock (reserved += qty, FEFO by expiry, StockMovement
  ADJUSTMENT_IN? no — reserve writes no ledger entry until ship; ledger entry ORDER_OUT
  on ship); clears cart
- `POST /shop/payments/{orderCode}/demo-pay` — captures payment (only when provider
  is demo i.e. no Razorpay keys); order → PAID
- `POST /shop/orders/lookup` {orderCode, email} → status timeline (tracking)

Admin API (`ADMIN`, `OPERATOR`):
- `GET /g/orders?status=` · `GET /g/orders/{code}` (lines + payment + timeline)
- `POST /g/orders/{code}/confirm|ship|deliver|cancel` — cancel {reason}: releases
  reserved stock; if PAID → refund

Payments (SOLID): `PaymentGateway` interface; `DemoGateway` (default, auto-capture);
`RazorpayGateway` (order create + HMAC-SHA256 signature verify + refund) selected by
`payment.provider=${PAYMENT_PROVIDER:demo}` + `payment.razorpay.key/id/secret` — with
no keys configured the demo gateway is always used.

Ship step: from the reserved positions, onHand -= qty and reserved -= qty with
StockMovement ORDER_OUT (reference order code) — appears in the Transaction Ledger.

## Storefront (feldnstein-react)

- `api/shopApi.js` — `VITE_SITE_API` base, cart token in localStorage
  (`feldnstein.cartToken`), sent as `X-Cart-Token`
- CartContext becomes real (API-backed): fetch cart, add/update/remove, badge count
- `CartDrawer` — slide-over: lines with qty steppers, remove, subtotal/GST/total,
  checkout CTA
- `Checkout` view — validated form → order + payment step (demo pay button with
  processing state) → confirmation with order code
- `TrackOrder` view — orderCode + email lookup → status timeline
- Header cart button opens the drawer

## Admin (platform-admin)

- `screens/orders.tsx` OrdersScreen: status filter pills, table (code, customer,
  items, total, payment pill, status pill), detail modal (lines, payment, timeline),
  actions with ConfirmModal (cancel asks reason)
- Nav: new "Orders" section (🛒), ADMIN + OPERATOR (fulfilment is an ops job)

## Verification

- e2e: new flow — cart add/update → checkout → demo-pay → admin confirm → ship
  (stock deducted, ORDER_OUT ledger entry) → deliver; cancel path (release + refund);
  RBAC (ops allowed, cust denied)
- UI suites: Flow I — storefront cart/drawer/checkout UX + admin orders screen
- mvn compile, tsc+build, storefront build, all suites green; push to main +
  premium-redesign
