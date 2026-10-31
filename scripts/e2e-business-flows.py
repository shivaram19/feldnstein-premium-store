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
