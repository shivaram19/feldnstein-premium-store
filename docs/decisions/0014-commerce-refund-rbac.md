# 0014. Commerce refund permission (OPERATOR vs ADMIN)

- Status: accepted

## Context

Order cancellation triggers an automatic payment refund (`FulfillmentService.cancel` → `payments.refund`). The order admin endpoints (`OrderAdminResource`) are `@RolesAllowed({"ADMIN","OPERATOR"})`, so any OPERATOR can cancel an order and thereby move money back to a customer. No record existed of who may do this, and the in-app ROLE_MATRIX (`platform-admin/src/screens/alerts.tsx`) did not mention order management at all.

## Decision Drivers

- Segregation of duties for money movement (first-principles §3: evidence over intuition; a money action without a recorded owner is unauditable)
- Day-one operational reality: the owner-operator wears both hats; a hard split could block demo fulfilment
- Audit interceptor exists (ADR-0010) but does not substitute for a deliberate permission decision

## Considered Options

1. Refund stays OPERATOR-accessible (status quo) + document it — zero friction for the single-operator launch; relies on audit log + low staff count; risk: any future OPERATOR hire can refund unsupervised
2. Split refund into an ADMIN-only endpoint — strongest segregation; adds a second login to a daily flow the same person performs; premature until a second OPERATOR exists
3. Do nothing — leaves a money-moving permission undocumented; violates AGENTS.md rule 1

## Decision

Option 1, explicitly recorded: OPERATOR may cancel orders and thereby refund payments, for the launch phase. This is a two-way door; it is revisited the moment a second OPERATOR account is created. Carried the most weight: §3.8 evidence over intuition (no evidence of a second operator exists) and §3.2 YAGNI (don't build a split-permission UI for a one-person operation). Options and framing came from an AI code-review agent; the human owner (repo owner) remains accountable for accepting it.

## Consequences

- ROLE_MATRIX must list order management + refund under OPERATOR (done in the same commit)
- Reopen trigger: creation of a second OPERATOR account, or first real-money Razorpay refund executed by non-owner staff
- Deferred: dedicated refund-only endpoint, partial refunds (recorded as known limitation), refund approval workflow
