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
  Flow 9  media pipeline, content blocks, site endpoints, RBAC
  Flow 11 marketing layer (ADR-0016): subscribe (public, idempotent), generate (admin RBAC), subscriber list
  Flow 12 loyalty (ADR-0018): earn on delivery, redeem at checkout, admin adjust
  Flow 13 B2B wholesale (ADR-0018): seller, order lifecycle, FEFO dispatch, cancel guard
  Flow 14 CRM contacts & social messaging (ADR-0019): upsert, merged list, interactions,
          WhatsApp opt-in, 24h session window, tasks, RBAC

Usage:  python3 scripts/e2e-business-flows.py [base_url]
        default base_url http://localhost:8080  (pass http://localhost:5173 to test the Vite proxy)

Mock data is tagged E2E-<timestamp>; it intentionally stays in the dev DB as demo data.
Exits 0 when every assertion passed, 1 otherwise.
"""
import base64
import io
import json
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from datetime import date

from PIL import Image

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


def patch(user, path, body):
    return call("PATCH", path, user, body)


def put(user, path, body):
    return call("PUT", path, user, body)


def put_bytes(user, path, data, content_type):
    """PUT raw bytes (media dev-upload), with auth but no JSON envelope."""
    req = urllib.request.Request(BASE + path, data=data, method="PUT")
    req.add_header("Authorization", "Basic " + base64.b64encode(f"{user}:{USERS[user]}".encode()).decode())
    req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req) as res:
            res.read()
            return res.status
    except urllib.error.HTTPError as e:
        e.read()
        return e.code


def anon_call(method, path):
    """Unauthenticated call returning (status, raw bytes)."""
    req = urllib.request.Request(BASE + path, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def make_jpeg(w=120, h=150):
    """A REAL decodable JPEG — ImageIO rejects tiny hand-rolled fixtures."""
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (200, 100, 50)).save(buf, "JPEG")
    return buf.getvalue()


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

    s, charts = get("admin", "/g/analytics/charts")
    check("6.12 charts open for ADMIN", s == 200, str(s))
    if s == 200:
        keys = {"batchStatus", "qcTrend", "yieldByMonth", "stockByProduct", "availability", "expiry", "spendByMonth"}
        check("6.13 charts series all present", keys.issubset(charts.keys()), str(sorted(charts.keys())))
        pct_sum = sum(float(r["pct"]) for r in charts["availability"])
        check("6.14 availability percentages sum to ~100", abs(pct_sum - 100) < 1.5, f"{pct_sum:.1f}")
    s, _ = get("ops", "/g/analytics/charts")
    check("6.15 RBAC: charts blocked for OPERATOR", s == 403, str(s))

    req = urllib.request.Request(f"{BASE}/g/stock-levels")
    try:
        urllib.request.urlopen(req)
        check("6.11 RBAC: anonymous blocked", False, "got 200")
    except urllib.error.HTTPError as e:
        check("6.11 RBAC: anonymous blocked", e.code == 401, str(e.code))


# ---------------------------------------------------------------- Flow 7
def flow7_negative_and_boundary():
    print("\n=== Flow 7 (expert): negative paths, boundaries, security probes ===")
    s, levels = get("ops", "/g/stock-levels?size=500")
    target = next((x for x in levels if x["onHand"] >= 3), None)
    check("7.0 fixture position with stock", target is not None)
    if not target:
        return
    th = target["onHand"]

    s, _ = post("ops", "/g/stock/transfers", {"stockLevelId": target["id"], "toWarehouseId": 2, "quantity": 0})
    check("7.1 transfer qty=0 rejected", s == 400, str(s))
    s, _ = post("ops", "/g/stock/transfers", {"stockLevelId": target["id"], "toWarehouseId": 2, "quantity": th + 9999})
    check("7.2 transfer beyond available rejected", s == 400, str(s))
    s, _ = post("ops", "/g/stock/transfers", {"stockLevelId": target["id"], "toWarehouseId": 2, "quantity": -5})
    check("7.3 transfer negative rejected", s == 400, str(s))
    s, _ = post("ops", "/g/stock/transfers", {"stockLevelId": 99999999, "toWarehouseId": 2, "quantity": 1})
    check("7.4 transfer unknown stock level → 404", s == 404, str(s))

    s, _ = post("ops", "/g/stock/adjustments", {"stockLevelId": target["id"], "adjustedQty": -1, "type": "DAMAGE", "reason": "x"})
    check("7.5 adjustment to negative rejected", s == 400, str(s))
    s, r = post("ops", "/g/stock/adjustments", {"stockLevelId": target["id"], "adjustedQty": th, "type": "COUNT", "reason": "noop"})
    check("7.6 no-op adjustment is safe (delta 0)", s in (200, 201) and r.get("delta") == 0, f"{s} {r}")

    s, r = post("ops", "/g/stock/hold", {"stockLevelId": target["id"], "quantity": 999999})
    check("7.7 hold beyond available rejected", s == 400, str(s))
    s, _ = post("ops", "/g/stock/release", {"stockLevelId": target["id"], "quantity": 999999})
    check("7.8 release beyond on-hold rejected", s == 400, str(s))

    dup = f"DUP-{TAG}"
    s, b1 = post("ops", "/g/production-batches?size=500", {
        "batchCode": dup, "product": {"id": 1}, "pressDate": str(date.today()),
        "seedType": "x", "seedQtyKg": 1, "seedCostTotal": 1, "status": "PRESSING"})
    check("7.9 create batch for gate test", s == 201, f"{s}")
    s, _ = post("ops", "/g/production-batches?size=500", {
        "batchCode": dup, "product": {"id": 1}, "pressDate": str(date.today()),
        "seedType": "x", "seedQtyKg": 1, "seedCostTotal": 1, "status": "PRESSING"})
    check("7.10 duplicate batch code rejected", s in (400, 409, 500), str(s))
    s, _ = put("ops", f"/g/production-batches/{b1['id']}", {**b1, "status": "RELEASED"})
    check("7.11 lifecycle skip PRESSING→RELEASED rejected", s not in (200, 201, 204), str(s))
    s, now = get("ops", f"/g/production-batches/{b1['id']}")
    check("7.12 skipped transition left status unchanged", now.get("status") == "PRESSING", str(now.get("status")))
    s, _ = put("ops", f"/g/production-batches/{b1['id']}", {**now, "status": "SEDIMENTATION"})
    check("7.13 valid one-step transition accepted", s in (200, 204), str(s))
    s, _ = put("ops", f"/g/production-batches/{b1['id']}", {**now, "status": "PRESSING"})
    check("7.14 backward transition rejected", s not in (200, 201, 204), str(s))

    s, created = post("ops", "/g/counts/plans", {"warehouseId": 1, "scopeDesc": f"neg {TAG}", "plannedDate": str(date.today())})
    plan = created["plan"]
    s, det = get("ops", f"/g/counts/plans/{plan['id']}")
    line = det["lines"][0]
    s, _ = put("ops", f"/g/counts/lines/{line['id']}", {"countedQty": 1})
    check("7.15 count line on PLANNED plan rejected (409)", s == 409, str(s))
    post("ops", f"/g/counts/plans/{plan['id']}/start")
    s, _ = post("ops", f"/g/counts/plans/{plan['id']}/complete")
    check("7.16 complete with uncounted lines rejected (409)", s == 409, str(s))
    for l in det["lines"]:
        put("ops", f"/g/counts/lines/{l['id']}", {"countedQty": l["systemQty"]})
    s, _ = post("ops", f"/g/counts/plans/{plan['id']}/complete")
    check("7.17 complete after full count accepted", s in (200, 201), str(s))
    s, _ = post("ops", f"/g/counts/plans/{plan['id']}/reconcile")
    check("7.18 first reconcile accepted", s in (200, 201), str(s))
    s, _ = post("ops", f"/g/counts/plans/{plan['id']}/reconcile")
    check("7.19 double reconcile rejected (409)", s == 409, str(s))

    s, _ = get("admin", "/g/reports/ledger?type=ORDER_OUT%27%20OR%20%271%27=%271")
    check("7.20 SQL-injection probe harmless", s == 200, str(s))
    s, evil = post("ops", "/g/suppliers", {"code": f"X-{TAG}", "type": "FARMER", "name": "<script>alert(1)</script>", "active": True})
    check("7.21 XSS payload stored without server error", s == 201, f"{s}")
    s, page_html = 0, None
    req = urllib.request.Request("http://localhost:8080/g/suppliers?size=500") if BASE.endswith("8080") else urllib.request.Request(f"{BASE}/g/suppliers?size=500")
    req.add_header("Authorization", "Basic " + base64.b64encode(b"ops:ops123").decode())
    with urllib.request.urlopen(req) as res:
        body = res.read().decode()
    check("7.22 XSS payload returned as data (React escapes on render)", "<script>alert(1)</script>" in body)


# ---------------------------------------------------------------- Flow 8
def flow8_rbac_sweep():
    print("\n=== Flow 8 (expert): RBAC matrix sweep ===")
    cases = [
        ("GET /g/stock-levels", "ops", "GET", "/g/stock-levels?size=1", 200),
        ("GET /g/audit-events", "ops", "GET", "/g/audit-events", 403),
        ("GET /g/settings", "ops", "GET", "/g/settings", 403),
        ("PUT /g/settings/1", "ops", "PUT", "/g/settings/1", 403),
        ("GET /g/reports/runs", "ops", "GET", "/g/reports/runs", 403),
        ("GET /g/report-schedules", "ops", "GET", "/g/report-schedules", 403),
        ("POST /g/report-schedules", "ops", "POST", "/g/report-schedules", 403),
        ("GET /g/analytics/dashboard", "ops", "GET", "/g/analytics/dashboard", 403),
        ("POST /g/alerts-ops/regenerate", "ops", "POST", "/g/alerts-ops/regenerate", 200),
        ("POST /g/stock/transfers", "ops", "POST", "/g/stock/transfers", 400),  # authed; body invalid → 400 not 403
        ("POST /g/production-batches", "cust", "POST", "/g/production-batches", 403),
        ("GET /g/stock-levels anon", "anon", "GET", "/g/stock-levels", 401),
    ]
    # 'cust' is not in USERS — handle manually
    ok = True
    for name, user, method, path, expect in cases:
        if user == "cust":
            req = urllib.request.Request(BASE + path, data=b"{}", method=method)
            req.add_header("Authorization", "Basic " + base64.b64encode(b"cust:cust123").decode())
            req.add_header("Content-Type", "application/json")
            try:
                urllib.request.urlopen(req)
                s = 200
            except urllib.error.HTTPError as e:
                s = e.code
        elif user == "anon":
            req = urllib.request.Request(BASE + path, method=method)
            try:
                urllib.request.urlopen(req)
                s = 200
            except urllib.error.HTTPError as e:
                s = e.code
        else:
            s, _ = (get if method == "GET" else call)(user, path) if method == "GET" else call(method, path, user, {} if method == "POST" else None)
        passed_case = s == expect
        ok = ok and passed_case
        print(f"  {'PASS' if passed_case else 'FAIL'}  {name} → {s} (expected {expect})")
    check("8.x RBAC sweep", ok)


# ---------------------------------------------------------------- Flow 9
def flow9_media_content():
    print("\n=== Flow 9 (expert): media pipeline, content blocks, site endpoints, RBAC ===")
    asset_key = "e2e-test-card-" + TAG.lower()  # assetKey charset is [a-z0-9:_-]
    jpeg = make_jpeg()
    BLOCK_KEY = "hero:main"
    headline = f"E2E Hero {TAG}"
    asset_id = None
    s0, prev = get("admin", f"/g/site-content/{BLOCK_KEY}")  # capture before any mutation

    try:
        # negative first: invalid assetKey must be rejected before any state is created
        s, bad = post("admin", "/g/media/presign", {"assetKey": "BAD KEY", "filename": "photo.jpg",
                                                    "contentType": "image/jpeg", "sizeBytes": len(jpeg)})
        check("9.1b presign invalid assetKey rejected (400)", s == 400, f"{s} {bad}")

        s, pre = post("admin", "/g/media/presign", {"assetKey": asset_key, "filename": "photo.jpg",
                                                    "contentType": "image/jpeg", "sizeBytes": len(jpeg)})
        presign_ok = s == 200 and isinstance(pre, dict) \
            and all(k in pre for k in ("uploadUrl", "assetId", "storageKey"))
        check("9.1 presign", presign_ok, f"{s} {pre}")
        if not presign_ok:
            for name in ("9.2 dev upload", "9.3 finalize", "9.4 variants generated",
                         "9.5 public file serving", "9.6 publish"):
                check(name, False, "presign failed; check not attempted")
        else:
            asset_id = pre["assetId"]
            upload_path = pre["uploadUrl"] if pre["uploadUrl"].startswith("/") else "/" + pre["uploadUrl"]
            s = put_bytes("admin", upload_path, jpeg, "image/jpeg")
            check("9.2 dev upload", s == 204, str(s))

            s, fin = post("admin", f"/g/media/{asset_id}/finalize")
            check("9.3 finalize", s == 200, f"{s} {fin}")

            asset = None
            for _ in range(20):  # VariantWorker polls every 2s; give it ~40s
                s, listing = get("admin", "/g/media")
                asset = next((a for a in listing if a["id"] == asset_id), None)
                if asset and asset["status"] in ("READY", "ERROR"):
                    break
                time.sleep(2)
            check("9.4 variants generated", asset is not None and asset["status"] == "READY"
                  and all(k in asset["variants"] for k in ("card", "hero", "banner", "thumb")),
                  f"{asset and asset['status']} {asset and asset['errorNote']}")

            if not (asset and asset["status"] == "READY"):
                check("9.5 public file serving", False, "asset never became READY (see 9.4)")
            else:
                s, body = anon_call("GET", asset["variants"]["card"])
                check("9.5 public file serving", s == 200 and body.startswith(b"\xff\xd8"),
                      f"{s} {body[:8]!r}")

            s, _ = post("admin", f"/g/media/{asset_id}/publish")
            check("9.6 publish", s in (200, 201, 204), str(s))

        s, body = anon_call("GET", "/site/products")
        products = json.loads(body) if s == 200 else []
        check("9.7 anon site products", s == 200 and len(products) > 0, f"{s} {body[:120]!r}")

        payload = {"headline": headline, "cta": "Shop now", "tag": TAG}
        s, _ = put("admin", f"/g/site-content/{BLOCK_KEY}", {"payload": json.dumps(payload)})
        check("9.8 content put", s in (200, 201, 204), str(s))

        s, block = get("admin", f"/g/site-content/{BLOCK_KEY}")
        check("9.9 content get", s == 200 and block.get("payload", {}).get("headline") == headline,
              f"{s} {block}")

        seen = None  # /site/content is cached 60s in-memory; poll until the new value surfaces
        for _ in range(18):  # 18 × 5s = 90s window
            s, body = anon_call("GET", "/site/content")
            data = json.loads(body) if s == 200 else {}
            seen = data.get(BLOCK_KEY, {}).get("headline")
            if s == 200 and seen == headline:
                break
            time.sleep(5)
        check("9.10 anon site content", s == 200 and seen == headline, f"{s} hero:main={seen!r}")

        req = urllib.request.Request(BASE + "/g/media")
        req.add_header("Authorization", "Basic " + base64.b64encode(b"cust:cust123").decode())
        try:
            urllib.request.urlopen(req)
            s = 200
        except urllib.error.HTTPError as e:
            s = e.code
        check("9.11 cust blocked from media admin", s == 403, str(s))

        s, _ = anon_call("GET", f"/g/site-content/{BLOCK_KEY}")
        check("9.12 anon blocked from content admin", s == 401, str(s))

        if asset_id is None:
            check("9.13 delete asset", False, "presign failed; no asset to delete")
        else:
            post("admin", f"/g/media/{asset_id}/unpublish")  # delete requires unpublished; ignore failure
            s, _ = call("DELETE", f"/g/media/{asset_id}", "admin")
            s2, listing = get("admin", "/g/media")
            check("9.13 delete asset", s in (200, 202, 204)
                  and all(a["id"] != asset_id for a in (listing or [])), f"delete={s} list={s2}")
    finally:
        # exception-safe cleanup: runs even when a check above raised mid-flow
        if s0 == 200:  # restore prior block contents so re-runs and demos see the old value
            s, _ = put("admin", f"/g/site-content/{BLOCK_KEY}", {"payload": json.dumps(prev["payload"])})
            if s not in (200, 201, 204):
                failed.append("9.x cleanup: restore content block")
                print(f"  FAIL  9.x cleanup: restore content block — PUT {s}")
        if asset_id is not None:  # no-op in the happy path (9.13 already deleted it)
            post("admin", f"/g/media/{asset_id}/unpublish")
            call("DELETE", f"/g/media/{asset_id}", "admin")
            s2, listing = get("admin", "/g/media")
            if any(a["id"] == asset_id for a in (listing or [])):
                failed.append("9.x cleanup: delete asset")
                print(f"  FAIL  9.x cleanup: delete asset — still listed (GET {s2})")


def flow10_commerce():
    """Full e-commerce loop: cart → checkout → pay → fulfil → deliver; cancel+refund path."""
    print("\n=== Flow 10: commerce — cart, checkout, payment, fulfilment, tracking ===")

    def shop(method, path, body=None, token=None):
        url = BASE + path
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        if token:
            req.add_header("X-Cart-Token", token)
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

    # pick a variant with real stock and a selling price
    _, levels = call("GET", "/g/stock-levels?size=500", "admin")
    _, site = shop("GET", "/site/products")
    priced_ids = {v["id"] for p in site for v in p.get("variants", []) if v.get("price")}
    best = max((l for l in levels if l["variant"]["id"] in priced_ids),
               key=lambda l: l["onHand"] - l["reserved"] - (l.get("onHold") or 0), default=None)
    check("10.0 a sellable priced variant exists", best is not None)
    if not best:
        return
    vid = best["variant"]["id"]
    sku = best["variant"]["sku"]
    avail_before = best["onHand"] - best["reserved"] - (best.get("onHold") or 0)
    reserved_before = best["reserved"]

    # cart: anonymous add → token issued
    s, cart = shop("POST", "/shop/cart/add", {"variantId": vid, "qty": 1})
    token = cart.get("token") if cart else None
    check("10.1 add to cart issues a cart token", s in (200, 201) and bool(token), str(s))
    check("10.2 cart line priced with GST", bool(token) and cart["lines"][0]["sku"] == sku
          and cart["gstTotal"] > 0, json.dumps(cart)[:120])

    # oversell protection
    s, err = shop("POST", "/shop/cart/add", {"variantId": vid, "qty": avail_before + 1000}, token=token)
    check("10.3 oversell rejected with friendly error", s == 400 and "available" in str(err), str(s))

    # qty update
    s, cart = shop("PUT", f"/shop/cart/items/{vid}", {"qty": 2}, token=token)
    check("10.4 quantity update recalculates totals", s == 200 and cart["lines"][0]["qty"] == 2
          and abs(cart["grandTotal"] - (cart["subTotal"] + cart["gstTotal"])) < 0.01, str(s))

    # RBAC on admin order endpoints
    s, _ = call("GET", "/g/orders", "ops")
    check("10.5 orders open for OPERATOR", s == 200, str(s))
    req = urllib.request.Request(f"{BASE}/g/orders")
    req.add_header("Authorization", "Basic " + base64.b64encode(b"cust:cust123").decode())
    try:
        urllib.request.urlopen(req)
        check("10.6 orders blocked for CUSTOMER", False, "got 200")
    except urllib.error.HTTPError as e:
        check("10.6 orders blocked for CUSTOMER", e.code == 403, str(e.code))

    # checkout validation + creation
    s, bad = shop("POST", "/shop/checkout", {"customerName": "X", "email": "not-an-email"},
                  token=token)
    check("10.7 invalid checkout rejected", s == 400, str(s))
    s, order = shop("POST", "/shop/checkout", {
        "customerName": "E2E Buyer", "email": "e2e-buyer@example.com", "phone": "9876543210",
        "address": "12 Temple Street", "city": "Vijayawada", "state": "AP", "pincode": "520001"}, token=token)
    check("10.8 checkout creates PENDING order", s == 201 and order["status"] == "PENDING", str(s))
    code = order["orderCode"]

    # stock reserved by checkout
    _, after = call("GET", f"/g/stock-levels/{best['id']}", "admin")
    check("10.9 checkout reserves stock", after["reserved"] == reserved_before + 2,
          f"reserved {after['reserved']} (was {reserved_before})")

    # demo payment
    s, paid = shop("POST", f"/shop/payments/{code}/demo-pay")
    check("10.10 demo payment captures → PAID", s == 200 and paid["status"] == "PAID"
          and paid["payment"]["status"] == "PAID", str(s))

    # fulfilment pipeline
    s, o = call("POST", f"/g/orders/{code}/confirm", "admin")
    check("10.11 confirm → CONFIRMED", s == 200 and o["status"] == "CONFIRMED", str(s))
    s, o = call("POST", f"/g/orders/{code}/ship", "admin")
    check("10.12 ship → SHIPPED", s == 200 and o["status"] == "SHIPPED", str(s))

    # stock deducted + ledger entry
    _, after = call("GET", f"/g/stock-levels/{best['id']}", "admin")
    check("10.13 ship deducts on-hand and frees reservation",
          after["onHand"] == best["onHand"] - 2 and after["reserved"] == reserved_before,
          f"onHand {after['onHand']}, reserved {after['reserved']}")
    _, moves = call("GET", "/g/stock-movements?size=500", "admin")
    check("10.14 ORDER_OUT ledger entry written", any(
        m.get("referenceId") == code and m["type"] == "ORDER_OUT" for m in moves))

    s, o = call("POST", f"/g/orders/{code}/deliver", "admin")
    check("10.15 deliver → DELIVERED", s == 200 and o["status"] == "DELIVERED", str(s))
    s, o = call("POST", f"/g/orders/{code}/cancel", "admin", {"reason": "too late"})
    check("10.16 delivered order cannot be cancelled", s == 400, str(s))

    # tracking
    s, t = shop("POST", "/shop/orders/lookup", {"orderCode": code, "email": "e2e-buyer@example.com"})
    check("10.17 tracking returns timeline", s == 200 and "DELIVERED" in t["timeline"], str(s))
    s, _ = shop("POST", "/shop/orders/lookup", {"orderCode": code, "email": "other@x.com"})
    check("10.18 tracking hides other people's orders", s == 404, str(s))

    # cancel + refund path on a fresh order
    s, cart2 = shop("POST", "/shop/cart/add", {"variantId": vid, "qty": 1})
    s, order2 = shop("POST", "/shop/checkout", {
        "customerName": "E2E Buyer", "email": "e2e-buyer@example.com", "phone": "9876543210",
        "address": "12 Temple Street", "city": "Vijayawada", "state": "AP", "pincode": "520001"},
        token=cart2["token"])
    code2 = order2["orderCode"]
    shop("POST", f"/shop/payments/{code2}/demo-pay")
    s, o2 = call("POST", f"/g/orders/{code2}/cancel", "admin", {"reason": "customer request"})
    check("10.19 cancel → CANCELLED + payment REFUNDED", s == 200 and o2["status"] == "CANCELLED"
          and o2["payment"]["status"] == "REFUNDED", str(s))
    _, after2 = call("GET", f"/g/stock-levels/{best['id']}", "admin")
    check("10.20 cancel releases the reservation", after2["reserved"] == reserved_before,
          f"reserved {after2['reserved']} (baseline {reserved_before}, level {best['id']}, variant {vid})")


def flow11_marketing():
    """AI marketing layer (ADR-0016): public subscribe, admin generate + subscriber list."""
    print("\n=== Flow 11: marketing — subscribe, idempotency, RBAC, copy generation ===")
    email = f"e2e-marketing-{TAG.lower()}@example.com".replace("_", "-")

    s, r = call("POST", "/shop/subscribe", "admin", {"email": email, "name": "E2E Subscriber"})
    check("11.1 subscribe valid email → 200", s == 200 and r.get("status") == "subscribed", str(s))

    s, r = call("POST", "/shop/subscribe", "admin", {"email": email, "name": "Again"})
    check("11.2 subscribe same email again → 200 (idempotent)", s == 200, str(s))

    s, r = call("POST", "/shop/subscribe", "admin", {"email": "not-an-email"})
    check("11.3 subscribe invalid email → 400", s == 400, str(s))

    req = urllib.request.Request(BASE + "/g/marketing/generate", method="POST",
                                 data=json.dumps({"task": "hero-copy", "context": {}}).encode())
    req.add_header("Content-Type", "application/json")
    try:
        urllib.request.urlopen(req)
        check("11.4 generate blocked for anonymous", False, "got 200")
    except urllib.error.HTTPError as e:
        check("11.4 generate blocked for anonymous", e.code == 401, str(e.code))

    s, r = call("POST", "/g/marketing/generate", "admin",
                {"task": "hero-copy", "context": {"productName": "Mothadaka Groundnut Oil"}})
    text = (r or {}).get("text", "")
    check("11.5 generate hero-copy as admin → 200 with non-empty text",
          s == 200 and bool(text.strip()), str(s))

    s, r = call("GET", "/g/marketing/subscribers", "admin")
    rows = (r or {}).get("subscribers", [])
    check("11.6 subscribers list as admin contains subscribed email",
          s == 200 and any(row.get("email") == email for row in rows), str(s))


def flow12_loyalty():
    """Loyalty (ADR-0018): earn on delivery, redeem at checkout, admin adjust, balance auth."""
    print("\n=== Flow 12: loyalty — earn on delivery, redeem at checkout ===")
    email = f"e2e-loyalty-{TAG.lower()}@example.com".replace("_", "-")

    def shop(method, path, body=None, token=None):
        url = BASE + path
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        if token:
            req.add_header("X-Cart-Token", token)
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

    # a sellable priced variant with stock
    _, levels = call("GET", "/g/stock-levels?size=500", "admin")
    _, site = shop("GET", "/site/products")
    priced_ids = {v["id"] for p in site for v in p.get("variants", []) if v.get("price")}
    best = max((l for l in levels if l["variant"]["id"] in priced_ids),
               key=lambda l: l["onHand"] - l["reserved"] - (l.get("onHold") or 0), default=None)
    check("12.0 a sellable priced variant exists", best is not None)
    if not best:
        return
    vid = best["variant"]["id"]

    def buy(qty, points=None):
        s, cart = shop("POST", "/shop/cart/add", {"variantId": vid, "qty": qty})
        if s not in (200, 201):
            return s, cart
        body = {"customerName": "E2E Loyalty", "email": email, "phone": "9876543210",
                "address": "12 Temple Street", "city": "Vijayawada", "state": "AP", "pincode": "520001"}
        if points is not None:
            body["pointsToRedeem"] = points
        return shop("POST", "/shop/checkout", body, token=cart["token"])

    # order A: full loop to DELIVERED → earns points
    s, order_a = buy(1)
    check("12.1 checkout creates order", s == 201 and order_a["status"] == "PENDING", str(s))
    code_a = order_a["orderCode"]
    shop("POST", f"/shop/payments/{code_a}/demo-pay")
    call("POST", f"/g/orders/{code_a}/confirm", "admin")
    call("POST", f"/g/orders/{code_a}/ship", "admin")
    s, o = call("POST", f"/g/orders/{code_a}/deliver", "admin")
    earned = (o or {}).get("pointsEarned", 0)
    check("12.2 deliver earns points (pointsEarned > 0)", s == 200 and o["status"] == "DELIVERED" and earned > 0,
          f"pointsEarned={earned}")

    # balance endpoint — authorised by an existing order matching code + email
    q = urllib.parse.quote(email)
    s, bal = shop("GET", f"/shop/loyalty/balance?email={q}&orderCode={code_a}")
    check("12.3 balance shows earned points", s == 200 and bal["balance"] == earned
          and bal["lifetimeEarned"] == earned, str(s))
    s, _ = shop("GET", f"/shop/loyalty/balance?email=other@x.com&orderCode={code_a}")
    check("12.4 balance rejects a wrong email (no leak)", s == 404, str(s))

    # order B: redeem points at checkout
    redeem = min(5, earned)
    s, order_b = buy(1, points=redeem)
    check("12.5 redeem reduces grandTotal on the receipt", s == 201
          and abs(order_b["grandTotal"] - (order_a["grandTotal"] - redeem)) < 0.01
          and order_b.get("loyalty", {}).get("redeemed") == redeem,
          f"grandTotal={order_b.get('grandTotal')} vs {order_a.get('grandTotal')} - {redeem}")
    code_b = order_b["orderCode"]

    s, bal2 = shop("GET", f"/shop/loyalty/balance?email={q}&orderCode={code_b}")
    check("12.6 balance drops by the redeemed points", s == 200 and bal2["balance"] == earned - redeem, str(bal2))

    # overspend rejected
    s, err = buy(1, points=earned + 100000)
    check("12.7 redeeming above balance rejected 400", s == 400 and "points" in str(err).lower(), str(s))

    # admin adjust (reason mandatory, ADMIN only)
    s, accounts = call("GET", f"/g/loyalty/accounts?q={q}", "admin")
    account_id = accounts[0]["id"] if s == 200 and accounts else None
    check("12.8 admin account search finds the buyer", s == 200 and account_id is not None, str(s))
    s, adj = call("POST", f"/g/loyalty/accounts/{account_id}/adjust", "admin",
                  {"points": 50, "reason": "e2e goodwill"})
    check("12.9 admin adjust credits points", s == 200 and adj["balance"] == earned - redeem + 50, str(s))
    s, _ = call("POST", f"/g/loyalty/accounts/{account_id}/adjust", "ops", {"points": 5, "reason": "nope"})
    check("12.10 adjust forbidden for OPERATOR", s == 403, str(s))
    s, _ = call("POST", f"/g/loyalty/accounts/{account_id}/adjust", "admin", {"points": 5})
    check("12.11 adjust without a reason rejected", s == 400, str(s))

    s, bal3 = shop("GET", f"/shop/loyalty/balance?email={q}&orderCode={code_b}")
    check("12.12 balance reflects the adjustment", s == 200 and bal3["balance"] == earned - redeem + 50, str(bal3))


def flow13_b2b():
    """B2B wholesale (ADR-0018): seller directory, order lifecycle, FEFO dispatch, cancel guard."""
    print("\n=== Flow 13: B2B wholesale — sellers, orders, FEFO dispatch ===")

    s, seller = call("POST", "/g/b2b/sellers", "admin",
                     {"name": f"E2E Seller {TAG}", "contactName": "E2E Contact"})
    check("13.1 seller created", s == 201 and bool(seller.get("id")), str(s))
    seller_id = (seller or {}).get("id")

    s, sellers = call("GET", "/g/b2b/sellers?q=e2e", "ops")
    check("13.2 seller list searchable for OPERATOR", s == 200
          and any(x["id"] == seller_id for x in (sellers or [])), str(s))

    # two DIFFERENT variants with stock at the same warehouse
    _, levels = call("GET", "/g/stock-levels?size=500", "admin")
    by_wh = {}
    for l in levels:
        wh = (l.get("warehouse") or {}).get("id")
        avail = l["onHand"] - l["reserved"] - (l.get("onHold") or 0)
        if wh and avail >= 3:
            by_wh.setdefault(wh, []).append(l)
    def two_variants(ls):
        seen, out = set(), []
        for x in ls:
            vid = x["variant"]["id"]
            if vid not in seen:
                seen.add(vid)
                out.append(x)
            if len(out) == 2:
                break
        return out if len(out) == 2 else []
    wh_id, picks = next(((wh, two_variants(ls)) for wh, ls in by_wh.items() if len(two_variants(ls)) == 2),
                        (None, []))
    check("13.3 a warehouse with 2 stocked variants exists", wh_id is not None)
    if not wh_id:
        return
    l1, l2 = picks[0], picks[1]
    v1, v2 = l1["variant"]["id"], l2["variant"]["id"]
    onhand1 = sum(x["onHand"] for x in by_wh[wh_id] if x["variant"]["id"] == v1)
    onhand2 = sum(x["onHand"] for x in by_wh[wh_id] if x["variant"]["id"] == v2)

    lines = [
        {"variantId": l1["variant"]["id"], "qty": 2, "unitPricePaise": 10000, "gstPct": 5},
        {"variantId": l2["variant"]["id"], "qty": 1, "unitPricePaise": 5000, "gstPct": 18},
    ]
    s, order = call("POST", "/g/b2b/orders", "admin",
                    {"sellerId": seller_id, "lines": lines, "notes": "e2e wholesale"})
    check("13.4 order created DRAFT with server-computed totals", s == 201 and order["status"] == "DRAFT"
          and order["subTotalPaise"] == 25000 and order["gstTotalPaise"] == 1900
          and order["grandTotalPaise"] == 26900, json.dumps(order)[:150])
    oid = order["id"]

    s, o = call("POST", f"/g/b2b/orders/{oid}/status", "admin", {"status": "CONFIRMED"})
    check("13.5 confirm → CONFIRMED", s == 200 and o["status"] == "CONFIRMED", str(s))

    s, _ = call("POST", f"/g/b2b/orders/{oid}/status", "admin", {"status": "DISPATCHED"})
    check("13.6 dispatch without warehouseId rejected", s == 400, str(s))

    s, o = call("POST", f"/g/b2b/orders/{oid}/status", "admin",
                {"status": "DISPATCHED", "warehouseId": wh_id})
    check("13.7 dispatch with warehouse → DISPATCHED", s == 200 and o["status"] == "DISPATCHED"
          and o["warehouseId"] == wh_id, str(s))

    _, levels_after = call("GET", "/g/stock-levels?size=500", "admin")
    a1 = sum(x["onHand"] for x in levels_after
             if x["variant"]["id"] == v1 and (x.get("warehouse") or {}).get("id") == wh_id)
    a2 = sum(x["onHand"] for x in levels_after
             if x["variant"]["id"] == v2 and (x.get("warehouse") or {}).get("id") == wh_id)
    check("13.8 dispatch deducts on-hand by line qty",
          a1 == onhand1 - 2 and a2 == onhand2 - 1,
          f"onHand {a1}/{a2} (was {onhand1}/{onhand2})")

    _, moves = call("GET", "/g/stock-movements?size=500", "admin")
    check("13.9 WHOLESALE_OUT ledger entries written", any(
        m.get("referenceId") == order["orderNo"] and m["type"] == "WHOLESALE_OUT" for m in (moves or [])))

    s, o = call("POST", f"/g/b2b/orders/{oid}/status", "admin", {"status": "DELIVERED"})
    check("13.10 deliver → DELIVERED", s == 200 and o["status"] == "DELIVERED", str(s))

    s, _ = call("POST", f"/g/b2b/orders/{oid}/status", "admin", {"status": "CANCELLED"})
    check("13.11 cancel of DELIVERED rejected 400", s == 400, str(s))

    # insufficient stock fails closed
    s, big = call("POST", "/g/b2b/orders", "admin", {"sellerId": seller_id, "lines": [
        {"variantId": l1["variant"]["id"], "qty": 100000, "unitPricePaise": 1000, "gstPct": 0}]})
    if s == 201:
        call("POST", f"/g/b2b/orders/{big['id']}/status", "admin", {"status": "CONFIRMED"})
        s, _ = call("POST", f"/g/b2b/orders/{big['id']}/status", "admin",
                    {"status": "DISPATCHED", "warehouseId": wh_id})
        check("13.12 insufficient-stock dispatch rejected 400", s == 400, str(s))
    else:
        check("13.12 insufficient-stock dispatch rejected 400", False, f"setup order failed: {s}")

    s, _ = call("GET", f"/g/b2b/orders/{oid}", "ops")
    check("13.13 order detail readable for OPERATOR", s == 200, str(s))
    req = urllib.request.Request(f"{BASE}/g/b2b/orders")
    req.add_header("Authorization", "Basic " + base64.b64encode(b"cust:cust123").decode())
    try:
        urllib.request.urlopen(req)
        check("13.14 wholesale blocked for CUSTOMER", False, "got 200")
    except urllib.error.HTTPError as e:
        check("13.14 wholesale blocked for CUSTOMER", e.code == 403, str(e.code))


def flow14_crm_social():
    """CRM contacts & social messaging (ADR-0019): upsert, merged list, interactions,
    WhatsApp opt-in, 24h session window (template required when closed), tasks, RBAC."""
    print("\n=== Flow 14: CRM contacts & social messaging ===")
    email = f"e2e-crm-{TAG.lower()}@example.com".replace("_", "-")
    q = urllib.parse.quote(email)

    s, c = call("POST", "/g/crm/contacts", "admin",
                {"email": email, "name": "E2E CRM Lead", "status": "LEAD", "tags": "e2e"})
    check("14.1 create contact (lead) → 201", s == 201 and c.get("profile", {}).get("email") == email,
          f"{s} {json.dumps(c)[:160]}")

    s, c2 = patch("admin", f"/g/crm/contacts/{q}", {"name": "E2E CRM Lead Updated"})
    s, rows = call("GET", f"/g/crm/contacts?q={q}", "ops")
    mine = [r for r in (rows or []) if r.get("email") == email]
    check("14.2 duplicate upsert same email → 200, still one contact",
          c2 is not None and len(mine) == 1 and mine[0].get("name") == "E2E CRM Lead Updated",
          json.dumps(mine)[:160])

    check("14.3 contact appears in merged list", len(mine) == 1 and mine[0].get("status") == "LEAD",
          json.dumps(mine)[:160])

    s, rows = call("GET", "/g/crm/contacts?q=" + urllib.parse.quote("e2e-buyer@example.com"), "ops")
    order_rows = [r for r in (rows or []) if r.get("email") == "e2e-buyer@example.com"]
    check("14.4 order-derived customer appears as ACTIVE",
          s == 200 and len(order_rows) == 1 and order_rows[0].get("status") == "ACTIVE"
          and order_rows[0].get("ordersCount", 0) >= 1, json.dumps(order_rows)[:160])

    s, note = call("POST", f"/g/crm/contacts/{q}/interactions", "ops",
                   {"channel": "NOTE", "body": "e2e note: prefers 1L tins"})
    check("14.5 note interaction recorded", s == 201, str(s))
    s, d = call("GET", f"/g/crm/contacts/{q}", "ops")
    check("14.5b note visible in detail with author",
          s == 200 and any(x.get("body") == "e2e note: prefers 1L tins" and x.get("author") == "ops"
                           for x in (d or {}).get("interactions", [])), json.dumps(d)[:200])

    s, inbound = call("POST", f"/g/crm/contacts/{q}/interactions", "ops",
                      {"channel": "WHATSAPP", "direction": "INBOUND",
                       "body": "hi, do you deliver to Kochi?", "handle": "919999999999"})
    check("14.6 inbound WHATSAPP recorded", s == 201, str(s))

    s, err = call("POST", "/g/crm/messages", "ops",
                  {"channel": "WHATSAPP", "email": email, "text": "free-form nudge"})
    check("14.7 WHATSAPP without opt-in → 400", s == 400 and "opt-in" in str(err), f"{s} {str(err)[:120]}")

    s, _ = patch("admin", f"/g/crm/contacts/{q}", {"whatsappOptIn": True, "whatsappOptInSource": "e2e"})
    s, sent = call("POST", "/g/crm/messages", "ops",
                   {"channel": "WHATSAPP", "email": email, "text": "yes, we deliver across Kerala"})
    check("14.8 opt-in then send succeeds (demo provider, session open)",
          s == 200 and sent.get("provider") == "demo" and sent.get("sessionOpen") is True
          and str(sent.get("providerRef", "")).startswith("demo-"), f"{s} {json.dumps(sent)[:160]}")
    s, d = call("GET", f"/g/crm/contacts/{q}", "ops")
    check("14.8b OUTBOUND interaction recorded", s == 200 and any(
        x.get("direction") == "OUTBOUND" and x.get("body") == "yes, we deliver across Kerala"
        and x.get("author") == "ops" for x in (d or {}).get("interactions", [])), json.dumps(d)[:200])

    # 24h window: a fresh opted-in contact with NO inbound — session is closed,
    # so free-form is rejected and a template name is required (backdating the
    # inbound timestamp is not possible through the API; the window-expiry
    # branch is covered by the unit suite on CrmService.sessionOpen).
    cold = f"e2e-crm-cold-{TAG.lower()}@example.com".replace("_", "-")
    call("POST", "/g/crm/contacts", "admin",
         {"email": cold, "whatsappPhone": "918888888888", "whatsappOptIn": True})
    s, err = call("POST", "/g/crm/messages", "ops",
                  {"channel": "WHATSAPP", "email": cold, "text": "free-form nudge"})
    check("14.9 closed session without template → 400", s == 400 and "template" in str(err),
          f"{s} {str(err)[:120]}")
    s, tpl = call("POST", "/g/crm/messages", "ops",
                  {"channel": "WHATSAPP", "email": cold, "text": "your batch is pressed",
                   "templateName": "order_update", "templateParams": ["FB-100"]})
    check("14.9b closed session with template → 200", s == 200 and tpl.get("sessionOpen") is False,
          f"{s} {json.dumps(tpl)[:160]}")
    s, d = call("GET", f"/g/crm/contacts/{urllib.parse.quote(cold)}", "ops")
    check("14.9c template name prefixes the recorded body", s == 200 and any(
        x.get("body", "").startswith("[order_update]") for x in (d or {}).get("interactions", [])),
        json.dumps(d)[:200])

    s, task = call("POST", "/g/crm/tasks", "ops",
                   {"email": email, "subject": "e2e follow up", "dueAt": "2020-01-01T00:00:00Z"})
    task_id = task if isinstance(task, (int, float)) else (task or {}).get("id")
    check("14.10 task created → 201", s == 201 and task_id, f"{s} {json.dumps(task)[:120]}")
    s, open_tasks = call("GET", "/g/crm/tasks?open=true", "ops")
    check("14.10b task in open list, overdue", s == 200 and any(
        t.get("id") == task_id and t.get("overdue") is True for t in (open_tasks or [])), json.dumps(open_tasks)[:200])
    s, _ = call("POST", f"/g/crm/tasks/{task_id}/done", "ops")
    s, open_after = call("GET", "/g/crm/tasks?open=true", "ops")
    check("14.10c done → leaves the open list", s == 200
          and not any(t.get("id") == task_id for t in (open_after or [])), json.dumps(open_after)[:200])

    s, _ = anon_call("GET", "/g/crm/contacts")
    check("14.11 anon blocked → 401", s == 401, str(s))
    req = urllib.request.Request(f"{BASE}/g/crm/contacts")
    req.add_header("Authorization", "Basic " + base64.b64encode(b"cust:cust123").decode())
    try:
        urllib.request.urlopen(req)
        check("14.11b customer blocked → 403", False, "got 200")
    except urllib.error.HTTPError as e:
        check("14.11b customer blocked → 403", e.code == 403, str(e.code))


def main():
    print(f"E2E business flows against {BASE}  (tag {TAG})")
    try:
        batch, variant, level = flow1_farmer_to_release()
        flow2_stock_ops(level)
        flow3_count_cycle()
        flow4_alerts(variant)
        flow5_po_grn()
        flow6_reports_rbac()
        flow7_negative_and_boundary()
        flow8_rbac_sweep()
        flow9_media_content()
        flow10_commerce()
        flow11_marketing()
        flow12_loyalty()
        flow13_b2b()
        flow14_crm_social()
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
