#!/usr/bin/env python3
"""
E2E business-flow tests for the feldnstein platform (gaanugu domain).

Drives the running dev server over HTTP through the complete business loops:
  Flow 1  farmer → seed procurement → batch → bottling → stock → QC → RELEASED
  Flow 2  stock transfer / adjustment / hold / release (+ ledger integrity)
  Flow 3  stock count cycle: plan → count → complete → reconcile (+ audit)
  Flow 4  alert lifecycle: rule fires → condition cleared → alert resolved
  Flow 5  packaging PO → goods receipt
  Flow 6  reports, schedules, and the RBAC matrix

Usage:  python3 scripts/e2e-business-flows.py [base_url]
        default base_url http://localhost:8080  (pass http://localhost:5173 to test the Vite proxy)

Mock data is tagged E2E-<timestamp>; it intentionally stays in the dev DB as demo data.
Exits 0 when every assertion passed, 1 otherwise.
"""
import base64
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import date

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
TAG = "E2E-" + date.today().strftime("%Y%m%d") + "-" + time.strftime("%H%M%S")
USERS = {"admin": "admin123", "ops": "ops123"}

passed, failed = [], []


def check(name, cond, detail=""):
    (passed if cond else failed).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + (f"  — {detail}" if detail and not cond else ""))


def call(method, path, user, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Basic " + base64.b64encode(f"{user}:{USERS[user]}".encode()).decode())
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as res:
            raw = res.read().decode()
            return res.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:200]}


def get(user, path):
    return call("GET", path, user)


def get_text(user, path):
    """GET returning the raw body (for CSV endpoints)."""
    req = urllib.request.Request(BASE + path)
    req.add_header("Authorization", "Basic " + base64.b64encode(f"{user}:{USERS[user]}".encode()).decode())
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def post(user, path, body=None):
    return call("POST", path, user, body)


def put(user, path, body):
    return call("PUT", path, user, body)


def set_batch_status(user, batch_id, status):
    s, b = get(user, f"/g/production-batches/{batch_id}")
    if s != 200:
        return s
    b["status"] = status
    s, _ = put(user, f"/g/production-batches/{batch_id}", b)
    return s


# ---------------------------------------------------------------- Flow 1
def flow1_farmer_to_release():
    print(f"\n=== Flow 1: farmer → procurement → batch → bottling → stock → QC → RELEASED ({TAG}) ===")
    s, farmer = post("ops", "/g/suppliers?size=500", {"code": f"F-{TAG}", "type": "FARMER", "name": f"E2E Farmer {TAG}", "active": True})
    check("1.1 create farmer (ops)", s == 201, f"{s} {farmer}")

    s, proc = post("ops", "/g/seed-procurements?size=500", {
        "procurementDate": str(date.today()), "seedType": "Groundnut (Java)",
        "farmer": {"id": farmer["id"]}, "qtyKg": 120, "ratePerKg": 95,
        "totalCost": 11400, "qualityGrade": "A", "paymentStatus": "PENDING", "transportCost": 800})
    check("1.2 record seed purchase (ops)", s == 201, f"{s} {proc}")

    s, products = get("ops", "/g/oil-products")
    product = products[0]
    bull = get("ops", "/g/bulls")[1][0]
    operator = get("ops", "/g/press-operators")[1][0]
    press = get("ops", "/g/presses")[1][0]

    batch_code = f"B-{TAG}-001"
    s, batch = post("ops", "/g/production-batches?size=500", {
        "batchCode": batch_code, "product": {"id": product["id"]}, "pressDate": str(date.today()),
        "seedType": "Groundnut (Java)", "seedQtyKg": 120, "seedCostTotal": 11400,
        "farmer": {"id": farmer["id"]}, "bull": {"id": bull["id"]},
        "operator": {"id": operator["id"]}, "press": {"id": press["id"]},
        "status": "PRESSING", "weatherNotes": "E2E flow test"})
    check("1.3 record pressing batch", s == 201, f"{s} {batch}")

    check("1.4 sedimentation", set_batch_status("ops", batch["id"], "SEDIMENTATION") in (200, 204))
    check("1.5 bottling_ready", set_batch_status("ops", batch["id"], "BOTTLING_READY") in (200, 204))

    variant = product.get("variants") and product["variants"][0] or get("ops", "/g/product-variants")[1][0]
    s, run = post("ops", "/g/bottling-runs", {
        "batch": {"id": batch["id"]}, "variant": {"id": variant["id"]}, "bottlingDate": str(date.today()),
        "bottlesFilled": 40, "bottlesDamaged": 1, "bottlesRejected": 0,
        "warehouse": {"id": 1}, "binLocation": "E2E-01", "stickerFrom": "E2E-0001", "stickerTo": "E2E-0040"})
    check("1.6 record bottling run", s == 201, f"{s} {run}")

    s, level = post("ops", "/g/stock-levels?size=500", {
        "variant": {"id": variant["id"]}, "batch": {"id": batch["id"]}, "warehouse": {"id": 1},
        "onHand": 40, "reserved": 0, "unitCost": 300, "expiryDate": "2027-10-29"})
    check("1.7 stock position created from bottling", s == 201, f"{s} {level}")

    check("1.8 batch → BOTTLING", set_batch_status("ops", batch["id"], "BOTTLING") in (200, 204))
    check("1.9 batch → QC_PENDING", set_batch_status("ops", batch["id"], "QC_PENDING") in (200, 204))

    s, qc = post("ops", "/g/quality-checks?size=500", {
        "batch": {"id": batch["id"]}, "stage": "PRE_RELEASE", "moisturePct": 5.9,
        "aflatoxinPpb": 3.2, "oilTempCelsius": 36.5, "overallPass": True,
        "notes": "E2E pass — temp under 40°C", "checkedBy": "e2e-ops"})
    check("1.10 QC pre-release pass (cold-press <40°C)", s == 201, f"{s} {qc}")

    check("1.11 batch → QC_PASSED", set_batch_status("ops", batch["id"], "QC_PASSED") in (200, 204))
    check("1.12 batch → RELEASED", set_batch_status("ops", batch["id"], "RELEASED") in (200, 204))

    s, batches = get("ops", "/g/production-batches?size=500")
    released = [b for b in batches if b["batchCode"] == batch_code and b["status"] == "RELEASED"]
    check("1.13 batch is RELEASED in list", len(released) == 1)
    return batch, variant, level


# ---------------------------------------------------------------- Flow 2
def flow2_stock_ops(level):
    print("\n=== Flow 2: transfer / adjustment / hold / release + ledger ===")
    s, before = get("ops", "/g/stock-levels?size=500")
    src = next(x for x in before if x["id"] == level["id"])
    dst_before = sum(x["onHand"] for x in before
                     if x["warehouse"]["id"] == 2 and x["variant"]["id"] == src["variant"]["id"])
    s, moves_before = get("ops", "/g/stock-movements?size=500")
    n_moves = len(moves_before)

    s, trf = post("ops", "/g/stock/transfers", {
        "stockLevelId": src["id"], "toWarehouseId": 2, "quantity": 5, "reason": "E2E dispatch"})
    check("2.1 transfer 5 units to WH2", s in (200, 201), f"{s} {trf}")

    s, after = get("ops", "/g/stock-levels?size=500")
    src_after = next(x for x in after if x["id"] == src["id"])
    dst_after = sum(x["onHand"] for x in after
                    if x["warehouse"]["id"] == 2 and x["variant"]["id"] == src["variant"]["id"])
    check("2.2 source on_hand reduced by 5", src_after["onHand"] == src["onHand"] - 5,
          f"{src_after['onHand']} vs {src['onHand'] - 5}")
    check("2.3 destination received exactly 5 (delta)", dst_after == dst_before + 5,
          f"{dst_before} → {dst_after}")

    s, moves = get("ops", "/g/stock-movements?size=500")
    trf_no = trf.get("transferNo")
    pair = [m["type"] for m in moves if m.get("referenceId") == trf_no]
    check("2.4 paired TRANSFER_OUT + TRANSFER_IN ledger rows", sorted(pair) == ["TRANSFER_IN", "TRANSFER_OUT"],
          f"ref={trf_no} found={pair}")

    s, adj = post("ops", "/g/stock/adjustments", {
        "stockLevelId": src["id"], "adjustedQty": src_after["onHand"] + 1, "type": "COUNT", "reason": "E2E count +1"})
    check("2.5 adjustment +1 (count)", s in (200, 201) and adj.get("delta") == 1, f"{s} {adj}")

    avail = src_after["onHand"] + 1
    s, hold = post("ops", "/g/stock/hold", {"stockLevelId": src["id"], "quantity": 2})
    check("2.6 hold 2 units", s in (200, 201) and hold.get("onHold") == 2, f"{s} {hold}")
    s, rel = post("ops", "/g/stock/release", {"stockLevelId": src["id"], "quantity": 2})
    check("2.7 release 2 units", s in (200, 201) and rel.get("onHold") == 0, f"{s} {rel}")

    s, moves = get("ops", "/g/stock-movements?size=500")
    refs = [m["referenceId"] for m in moves if m.get("referenceId")]
    check("2.8 adjustment has ledger reference", any("ADJ" in (r or "") for r in refs), str(refs[-3:]))
    return src


# ---------------------------------------------------------------- Flow 3
def flow3_count_cycle():
    print("\n=== Flow 3: stock count cycle → reconciliation → audit ===")
    s, created = post("ops", "/g/counts/plans", {
        "warehouseId": 1, "scopeDesc": f"E2E count {TAG}", "plannedDate": str(date.today())})
    plan = created["plan"] if s in (200, 201) else None
    check("3.1 create plan with lines", s in (200, 201) and created.get("lines", 0) > 0, f"{s} {created}")

    s, detail = get("ops", f"/g/counts/plans/{plan['id']}")
    lines = detail.get("lines", [])
    check("3.2 plan detail lists lines", len(lines) == created["lines"])

    s, _ = post("ops", f"/g/counts/plans/{plan['id']}/start")
    check("3.3 start count", s in (200, 201))

    for i, line in enumerate(lines):
        counted = line["systemQty"] - 1 if i == 0 else line["systemQty"]
        s, _ = put("ops", f"/g/counts/lines/{line['id']}", {"countedQty": counted, "countedBy": "e2e-ops"})
        if s != 200:
            check("3.4 record counts", False, f"line {line['id']} -> {s}")
            return plan
    check("3.4 record counts (first line short by 1)", True)

    s, done = post("ops", f"/g/counts/plans/{plan['id']}/complete")
    check("3.5 complete computes variance", s in (200, 201), f"{s} {done}")

    s, rec = post("ops", f"/g/counts/plans/{plan['id']}/reconcile")
    check("3.6 reconcile posts adjustment", s in (200, 201) and rec.get("adjustmentsPosted", 0) >= 1, f"{s} {rec}")

    s, audit = get("admin", "/g/audit-events?limit=50")
    actions = [e["action"] for e in audit]
    check("3.7 audit captured count actions", "COUNT_PLAN_RECONCILE" in actions and "STOCK_TRANSFER" in actions, str(actions[:8]))
    return plan


# ---------------------------------------------------------------- Flow 4
def flow4_alerts(variant):
    print("\n=== Flow 4: alert lifecycle (fire → clear → resolve) ===")
    sku = variant["sku"]
    s, rule = post("ops", "/g/alert-rules", {
        "ruleType": "LOW_STOCK", "scopeRef": sku, "thresholdValue": 100000, "active": True})
    check("4.1 create low-stock rule (impossible threshold)", s == 201, f"{s} {rule}")

    s, regen = post("ops", "/g/alerts-ops/regenerate")
    s, alerts = get("ops", "/g/alerts")
    fired = [a for a in alerts if a["alertType"] == "LOW_STOCK" and a["status"] == "OPEN" and sku in a["message"]]
    check("4.2 rule fired an open alert for the SKU", len(fired) >= 1, f"open={[ (a['alertType'],a['refId']) for a in alerts if a['status']=='OPEN' ]}")

    s, _ = put("ops", f"/g/alert-rules/{rule['id']}", {**rule, "active": False})
    s, _ = post("ops", "/g/alerts-ops/regenerate")
    s, alerts = get("ops", "/g/alerts")
    resolved = [a for a in alerts if a["alertType"] == "LOW_STOCK" and a["status"] == "RESOLVED" and sku in a["message"]]
    check("4.3 clearing the condition resolves the alert", len(resolved) >= 1)


# ---------------------------------------------------------------- Flow 5
def flow5_po_grn():
    print("\n=== Flow 5: packaging PO → goods receipt ===")
    s, vendor = post("ops", "/g/suppliers?size=500", {
        "code": f"P-{TAG}", "type": "PACKAGING", "name": f"E2E Packaging {TAG}", "active": True})
    check("5.1 create packaging vendor", s == 201, f"{s} {vendor}")

    s, po = post("ops", "/g/purchase-orders?size=500", {
        "poNumber": f"PO-{TAG}-001", "supplier": {"id": vendor["id"]}, "deliveryWarehouse": {"id": 1},
        "orderDate": str(date.today()), "expectedDelivery": "2026-11-05", "status": "SENT", "notes": "E2E PO"})
    check("5.2 raise PO", s == 201, f"{s} {po}")

    s, line = post("ops", "/g/purchase-order-lines", {
        "purchaseOrder": {"id": po["id"]}, "itemType": "BOTTLE", "spec": "500ml amber glass, 28mm neck",
        "quantity": 500, "unitPrice": 8.5, "taxPct": 18})
    check("5.3 add PO line", s == 201, f"{s} {line}")

    s, grn = post("ops", "/g/goods-receipts", {
        "grnNumber": f"GRN-{TAG}-001", "purchaseOrder": {"id": po["id"]}, "receiptDate": str(date.today()),
        "deliveryNoteNo": "DN-E2E-1", "conditionNote": "All good", "receivedBy": "e2e-ops"})
    check("5.4 record GRN against PO", s == 201, f"{s} {grn}")

    s, pos = get("ops", "/g/purchase-orders?size=500")
    check("5.5 PO visible in list", any(p["poNumber"] == f"PO-{TAG}-001" for p in pos))


# ---------------------------------------------------------------- Flow 6
def flow6_reports_rbac():
    print("\n=== Flow 6: reports, schedules, RBAC matrix ===")
    for r in ["inventory-summary", "production-yield", "expiry-fefo", "procurement-spend"]:
        s, rows = get("admin", f"/g/reports/{r}")
        check(f"6.1 {r} (json)", s == 200 and isinstance(rows, list) and len(rows) > 0, f"{s}")
        s, csv_text = get_text("admin", f"/g/reports/{r}?format=csv")
        check(f"6.2 {r} (csv)", s == 200 and "," in csv_text.splitlines()[0], f"{s}")

    s, led = get("admin", "/g/reports/ledger?groupBy=PRODUCT&from=2026-01-01&to=2026-12-31")
    check("6.3 custom ledger builder groupBy=PRODUCT", s == 200 and isinstance(led, list), f"{s}")

    s, before = get("admin", "/g/reports/runs")
    s, _ = post("admin", "/g/reports/schedules/1/run-now")
    s, after = get("admin", "/g/reports/runs")
    # the runs list is capped at 50 rows, so assert a NEW run appeared at the head instead of counting
    check("6.4 schedule run-now produces a run", s in (200, 201) and after[0]["id"] != before[0]["id"],
          f"{s} head {before[0]['id']}→{after[0]['id']}")

    run_id = after[0]["id"]
    req = urllib.request.Request(f"{BASE}/g/reports/runs/{run_id}/csv")
    req.add_header("Authorization", "Basic " + base64.b64encode(b"admin:admin123").decode())
    with urllib.request.urlopen(req) as res:
        csv_head = res.read().decode()[:60]
    check("6.5 run CSV downloadable", csv_head.startswith("SKU,"), csv_head)

    s, _ = get("ops", "/g/audit-events")
    check("6.6 RBAC: audit log blocked for OPERATOR", s == 403, str(s))
    s, _ = get("ops", "/g/settings")
    check("6.7 RBAC: settings blocked for OPERATOR", s == 403, str(s))
    s, _ = get("ops", "/g/reports/inventory-summary")
    check("6.8 RBAC: reports blocked for OPERATOR", s == 403, str(s))
    s, _ = get("ops", "/g/analytics/dashboard")
    check("6.9 RBAC: analytics blocked for OPERATOR", s == 403, str(s))
    s, _ = get("admin", "/g/analytics/dashboard")
    check("6.10 analytics open for ADMIN", s == 200, str(s))

    req = urllib.request.Request(f"{BASE}/g/stock-levels")
    try:
        urllib.request.urlopen(req)
        check("6.11 RBAC: anonymous blocked", False, "got 200")
    except urllib.error.HTTPError as e:
        check("6.11 RBAC: anonymous blocked", e.code == 401, str(e.code))


def main():
    print(f"E2E business flows against {BASE}  (tag {TAG})")
    try:
        batch, variant, level = flow1_farmer_to_release()
        flow2_stock_ops(level)
        flow3_count_cycle()
        flow4_alerts(variant)
        flow5_po_grn()
        flow6_reports_rbac()
    except Exception as e:  # noqa: BLE001 — report and fail the run
        failed.append(f"unhandled: {e}")
        print(f"\n  FAIL  unhandled exception: {e!r}")

    print(f"\n{'=' * 60}\n{len(passed)} passed, {len(failed)} failed")
    if failed:
        print("failures:")
        for f in failed:
            print(f"  - {f}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
