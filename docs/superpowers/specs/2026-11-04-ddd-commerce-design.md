# Domain-Driven Design — commerce bounded contexts & tactical model

Date: 2026-11-04. Applies DDD (Evans; distilled in the
[KitUtils DDD guide](https://kitutils.com/learn/architecture/domain-driven-design),
[Milan Jovanović on ubiquitous language](https://milanjovanovic.tech/blog/ubiquitous-language-ddd),
[DevIQ bounded context](https://deviq.com/domain-driven-design/bounded-context/))
to the feldnstein platform, deepening the e-commerce capabilities from spec
`2026-11-04-ecommerce-capabilities-design.md`. Research-grounded; the goal is a model
that reads like the business talks: *farmer → seed → press → bottle → stock → order →
payment → delivery*.

## Strategic: bounded contexts and context map

| Context | Package | Type | Relationship |
|---|---|---|---|
| Catalog & Pricing | `gaanugu.catalog`, `gaanugu.settings.PriceConfig` | core upstream | Sales is **conformist** — consumes Variant/PriceConfig as-is |
| Inventory | `gaanugu.inventory` | core | Sales reserves/deducts through `StockAllocator` (**ACL** — the sales model never speaks StockLevel directly) |
| **Sales (ordering)** | `commerce.cart`, `commerce.order`, `commerce.fulfillment` | **core — deepest modelling** | published API `/shop/*` is an **open host service** |
| Payments | `commerce.payment` | generic/supporting | `PaymentGateway` port + adapters = **anti-corruption layer** vs Razorpay/demo |
| Media & Content | `media` | supporting | — |
| Compliance & Audit | `gaanugu.settings.Audit*`, `AuditInterceptor` | supporting | — |

## Ubiquitous language (glossary)

- **Cart** — a visitor's selection, identified by an opaque token, expiring after 24h.
- **Order** — a placed purchase with lines, a totals breakdown (subtotal, GST, grand
  total), a delivery address and a lifecycle: PENDING → PAID → CONFIRMED → SHIPPED →
  DELIVERED; CANCELLED from PENDING/PAID/CONFIRMED.
- **Reserve** — stock set aside for an order at checkout (cannot be sold to others);
  **release** — reservation returned on cancel; **deduct** — reservation consumed as
  ORDER_OUT in the ledger when an order ships.
- **Payment** — an attempt to collect the grand total via a provider (DEMO or
  RAZORPAY); captured or refunded.
- **Sellable** — on-hand minus reserved minus on-hold. Overselling is impossible by
  construction.

## Tactical decisions

- **Value objects** (`commerce.shared`): `Money` (INR, non-negative, scale-checked),
  `Quantity` (≥ 0), `GstRate` (0–100), `OrderNo`, `EmailAddress`, `PhoneNumber`,
  `Pincode`, `DeliveryAddress`. Immutable, self-validating; arithmetic lives on `Money`.
- **Aggregates**: `Cart` (root) owns `CartItem`s; `CustomerOrder` (root) owns
  `OrderLine`s and **enforces the status machine** — `confirm/ship/deliver/cancel`
  are root methods that throw on illegal transitions; `Payment` guards
  initiated → paid → refunded. Nothing outside references `CartItem`/`OrderLine`
  directly.
- **Domain services** (stateless, used sparingly): `StockAllocator` (FEFO
  reserve/release/deduct across stock positions, writes ORDER_OUT ledger entries),
  pricing policy (`Pricing` — active SELLING config else MRP).
- **Application services** (thin, transaction boundary, no business rules):
  `CheckoutService` (cart → reserve → order → payment initiation),
  `FulfillmentService` (confirm/ship/deliver/cancel orchestration),
  `CartSession` (token resolution/expiry), `PaymentService` (gateway selection).
- **Ports & adapters**: `PaymentGateway` port with `DemoGateway` and
  `RazorpayGateway` (config-gated) adapters; REST resources are thin driving adapters
  that map domain exceptions to friendly 4xx responses.
- **Persistence pragmatism** (per the KitUtils guidance): Panache active-record stays
  on the aggregates — a deliberate compromise; the schema and REST payloads are
  unchanged so all 116 e2e + 44/44 UI assertions keep passing. Fields are private
  outside-in; access goes through aggregate methods.

## What this is NOT (yet)

No event bus (domain events drained in-process), no separate read model, no saga.
Cart expiry is lazy, not scheduled. These are recorded as roadmap, not built (YAGNI).
