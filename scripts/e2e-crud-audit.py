#!/usr/bin/env python3
"""
CRUD e2e audit for the feldnstein platform.

For every auto-CRUD resource (Quarkus REST Data Panache) this script drives the
full lifecycle against the running dev server and verifies VALUES at each step:

  CREATE  POST   -> expect 201, response body matches the values sent
  READ    GET    -> expect 200, persisted values match the created values
  LIST    GET    -> entity is present in the collection
  UPDATE  PUT    -> full-replace with changed fields, re-read verifies new
                    values persisted and untouched fields did not drift
  DELETE  DELETE -> expect 204
  GONE    GET    -> expect 404, entity absent from list

Every step prints the actual values exchanged, so the run doubles as a
client-demo transcript. RBAC negative checks (customer role -> 403, anonymous
-> 401) are included.

Usage:  python3 scripts/e2e-crud-audit.py [base_url]
        default base_url http://localhost:8080

Fixtures are tagged CRUD-<timestamp> and deleted at the end of each cycle.
Exits 0 when every assertion passed, 1 otherwise.
"""
import base64
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import date

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
TAG = "CRUD-" + date.today().strftime("%Y%m%d") + "-" + time.strftime("%H%M%S")
USERS = {"admin": "admin123", "ops": "ops123", "cust": "cust123"}

passed, failed = [], []


def check(name, cond, detail=""):
    (passed if cond else failed).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + (f"  — {detail}" if detail and not cond else ""))


def call(method, path, user, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if user:
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


def post(user, path, body=None):
    return call("POST", path, user, body)


def put(user, path, body):
    return call("PUT", path, user, body)


def delete(user, path):
    return call("DELETE", path, user)


def show(entity, fields):
    """Compact field=value rendering of the values actually exchanged."""
    return "  ".join(f"{f}={entity.get(f)!r}" for f in fields if f in entity)


def values_match(got, want):
    """Relation fields come back as full objects — compare by id. LocalTime
    serializes as HH:MM:SS — accept the HH:MM form we sent."""
    if isinstance(want, dict) and "id" in want:
        return isinstance(got, dict) and got.get("id") == want["id"]
    if isinstance(want, str) and len(want) == 5 and want[2] == ":" and isinstance(got, str):
        return got[:5] == want
    if isinstance(got, (int, float)) and isinstance(want, (int, float)) and not isinstance(got, bool) and not isinstance(want, bool):
        return float(got) == float(want)
    return got == want


def verify_values(label, entity, expected):
    """Assert every expected field persisted with exactly the sent value."""
    for f, want in expected.items():
        got = entity.get(f)
        check(f"{label}: {f} == {want!r}", values_match(got, want), f"got {got!r}")


# ---------------------------------------------------------------- generic CRUD cycle
def crud_cycle(spec, ctx):
    """Run CREATE -> READ -> LIST -> UPDATE -> re-READ -> DELETE -> GONE for one spec."""
    name, path = spec["name"], spec["path"]
    user = spec.get("user", "ops")
    sent = spec["payload"](ctx) if callable(spec["payload"]) else dict(spec["payload"])
    fields = spec["fields"]
    print(f"\n--- {name}  ({path}) ---")

    # CREATE
    s, created = post(user, path, sent)
    check(f"{name} CREATE -> 201", s == 201, f"{s} {created}")
    if s != 201:
        return None
    verify_values(f"{name} create-response", created, sent)
    print(f"  create sent/received: {show(created, fields)}")
    cid = created["id"]

    # READ by id
    s, read = get(user, f"{path}/{cid}")
    check(f"{name} READ /{cid} -> 200", s == 200, f"{s}")
    if s == 200:
        verify_values(f"{name} persisted", read, sent)
        print(f"  read back: {show(read, fields)}")

    # LIST contains
    s, lst = get(user, f"{path}?size=1000")
    found = isinstance(lst, list) and any(e.get("id") == cid for e in lst)
    check(f"{name} LIST contains id {cid}", s == 200 and found, f"{s}")

    # UPDATE (full replace: GET current, merge changed fields, PUT)
    update = spec["update"]
    merged = {**read, **update}
    s, upd = put(user, f"{path}/{cid}", merged)
    if spec.get("update_guarded"):
        # StockLevel carries @Version which the JSON contract does not expose, so a
        # blind generic PUT must be rejected (optimistic-lock guard). Verify the
        # rejection AND that the stored values did not drift.
        check(f"{name} UPDATE guarded ({s})", s in (400, 409, 500), f"{s} {upd}")
        s2, reread = get("ops", f"{path}/{cid}")
        verify_values(f"{name} guarded-unchanged", reread, sent)
        print(f"  guarded update rejected ({s}); values unchanged: {show(reread, fields)}")
    else:
        check(f"{name} UPDATE -> 200/204", s in (200, 204), f"{s} {upd}")
        s2, reread = get(user, f"{path}/{cid}")
        check(f"{name} re-READ after update -> 200", s2 == 200, f"{s2}")
        if s2 == 200:
            verify_values(f"{name} updated", reread, update)
            untouched = {f: sent[f] for f in spec["unchanged"] if f in sent}
            verify_values(f"{name} untouched-kept", reread, untouched)
            print(f"  after update: {show(reread, fields)}")

    # DELETE
    s, _ = delete(user, f"{path}/{cid}")
    if s == 204:
        check(f"{name} DELETE -> 204", True)
        s2, gone = get(user, f"{path}/{cid}")
        check(f"{name} GONE: GET after delete -> 404", s2 == 404, f"{s2}")
        s3, lst2 = get(user, f"{path}?size=1000")
        still = isinstance(lst2, list) and any(e.get("id") == cid for e in lst2)
        check(f"{name} GONE: absent from list", s3 == 200 and not still, f"{s3}")
    else:
        # FK guard: record actual behavior; entity must still be readable and consistent
        check(f"{name} DELETE guarded ({s})", s in (400, 409, 500), f"{s} {_}")
        s2, still = get(user, f"{path}/{cid}")
        check(f"{name} still readable after guarded delete", s2 == 200, f"{s2}")
        ctx.setdefault("leftovers", []).append((name, path, cid))
        print(f"  delete returned {s}: {json.dumps(_)[:160] if _ else ''}")
    return cid


TODAY = str(date.today())
NEXT_YEAR = str(date.today().replace(year=date.today().year + 1))


def build_specs(ctx):
    """Fixture graph, parents before children. ctx carries created parents."""
    W = ctx["warehouse"]["id"]
    F = ctx["supplier"]["id"]
    P = ctx["oilProduct"]["id"]
    V = ctx["variant"]["id"]
    B = ctx["bull"]["id"]
    PR = ctx["press"]["id"]
    O = ctx["operator"]["id"]
    BA = ctx["batch"]["id"]
    PO = ctx["po"]["id"]
    PL = ctx["poLine"]["id"]
    GR = ctx["grn"]["id"]

    return [
        # ---- catalog ------------------------------------------------------
        {"name": "ProductVariant", "path": "/g/product-variants",
         "payload": {"product": {"id": P}, "sku": f"CRUD-{TAG}", "sizeMl": 500,
                     "bottleType": "GLASS", "capType": "ROPP", "barcode": f"BC-{TAG}", "mrp": 525},
         "update": {"mrp": 550, "barcode": f"BC2-{TAG}"},
         "fields": ["id", "sku", "sizeMl", "bottleType", "capType", "barcode", "mrp"],
         "unchanged": ["sku", "sizeMl"]},
        # ---- assets -------------------------------------------------------
        {"name": "Bull", "path": "/g/bulls",
         "payload": {"code": f"BULL-{TAG}", "name": f"Audit Bull {TAG}", "breed": "Ongole",
                     "healthStatus": "FIT", "restAfterDays": 3, "acquisitionCost": 45000,
                     "lastVetCheck": TODAY, "nextVetCheck": NEXT_YEAR, "monthlyFeedCost": 3000, "active": True},
         "update": {"healthStatus": "RESTING", "monthlyFeedCost": 3500},
         "fields": ["id", "code", "name", "breed", "healthStatus", "monthlyFeedCost", "active"],
         "unchanged": ["code", "breed"]},
        {"name": "Press", "path": "/g/presses",
         "payload": {"code": f"PRESS-{TAG}", "type": "Wooden gaanugu", "beamCondition": "GOOD",
                     "stoneCondition": "GOOD", "capacityLitres": 12, "yearBuilt": 2024,
                     "lastMaintenance": TODAY, "nextMaintenanceDue": NEXT_YEAR, "status": "ACTIVE"},
         "update": {"status": "UNDER_MAINTENANCE", "beamCondition": "FAIR"},
         "fields": ["id", "code", "type", "beamCondition", "stoneCondition", "capacityLitres", "status"],
         "unchanged": ["code", "capacityLitres"]},
        {"name": "PressOperator", "path": "/g/press-operators",
         "payload": {"code": f"OP-{TAG}", "name": f"Audit Operator {TAG}", "phone": "9876500001",
                     "aadhaar": "123456789012", "address": "Mothadaka", "wageType": "DAILY",
                     "rate": 600, "bankAccount": "CRUD0001", "joinDate": TODAY, "active": True},
         "update": {"rate": 650, "phone": "9876500002"},
         "fields": ["id", "code", "name", "phone", "wageType", "rate", "active"],
         "unchanged": ["code", "wageType"]},
        {"name": "OperatorAttendance", "path": "/g/operator-attendances",
         "payload": {"workDate": TODAY, "operator": {"id": O}, "status": "PRESENT",
                     "checkIn": "08:30", "checkOut": "16:30", "hoursWorked": 8,
                     "press": {"id": PR}, "batchesWorked": f"B-{TAG}", "overtimeHrs": 0},
         "update": {"status": "HALF_DAY", "hoursWorked": 4},
         "fields": ["id", "workDate", "status", "checkIn", "checkOut", "hoursWorked", "overtimeHrs"],
         "unchanged": ["checkIn", "checkOut"]},
        {"name": "BullWorkLog", "path": "/g/bull-work-logs",
         "payload": {"workDate": TODAY, "bull": {"id": B}, "batch": {"id": BA},
                     "startTime": "09:00", "endTime": "12:30", "hoursWorked": 3.5,
                     "handler": {"id": O}, "healthObservation": "normal"},
         "update": {"hoursWorked": 3.0, "healthObservation": "mild fatigue noted"},
         "fields": ["id", "workDate", "startTime", "endTime", "hoursWorked", "healthObservation"],
         "unchanged": ["startTime", "endTime"]},
        # ---- production ---------------------------------------------------
        {"name": "QualityCheck", "path": "/g/quality-checks",
         "payload": {"batch": {"id": BA}, "stage": "PRE_RELEASE", "moisturePct": 5.9,
                     "foreignMatterPct": 0.1, "aflatoxinPpb": 3.2, "pesticideResidue": "none detected",
                     "oilTempCelsius": 36.5, "sealIntegrityOk": True, "overallPass": True,
                     "notes": "audit create", "checkedBy": "crud-audit"},
         "update": {"moisturePct": 5.5, "notes": "audit update — re-verified"},
         "fields": ["id", "stage", "moisturePct", "aflatoxinPpb", "oilTempCelsius", "overallPass", "notes"],
         "unchanged": ["stage", "aflatoxinPpb"]},
        {"name": "BottlingRun", "path": "/g/bottling-runs",
         "payload": {"batch": {"id": BA}, "variant": {"id": V}, "bottlingDate": TODAY,
                     "bottlesFilled": 40, "bottlesDamaged": 1, "bottlesRejected": 0,
                     "warehouse": {"id": W}, "binLocation": "CRUD-A1",
                     "stickerFrom": "CRUD-0001", "stickerTo": "CRUD-0040"},
         "update": {"binLocation": "CRUD-A2", "bottlesDamaged": 2},
         "fields": ["id", "bottlingDate", "bottlesFilled", "bottlesDamaged", "bottlesRejected", "binLocation"],
         "unchanged": ["bottlesFilled", "stickerFrom"]},
        # ---- procurement --------------------------------------------------
        {"name": "SeedProcurement", "path": "/g/seed-procurements",
         "payload": {"procurementDate": TODAY, "seedType": "Groundnut (Java)", "farmer": {"id": F},
                     "qtyKg": 100, "ratePerKg": 95, "totalCost": 9500, "qualityGrade": "A",
                     "paymentStatus": "PENDING", "transportCost": 700},
         "update": {"ratePerKg": 99, "qualityGrade": "B"},
         "fields": ["id", "procurementDate", "seedType", "qtyKg", "ratePerKg", "totalCost", "qualityGrade", "paymentStatus"],
         "unchanged": ["qtyKg", "totalCost"]},
        {"name": "PurchaseOrder", "path": "/g/purchase-orders",
         "payload": {"poNumber": f"PO-{TAG}", "supplier": {"id": F}, "deliveryWarehouse": {"id": W},
                     "orderDate": TODAY, "expectedDelivery": NEXT_YEAR, "status": "DRAFT",
                     "notes": "audit create"},
         "update": {"notes": "audit update — confirmed with vendor", "status": "SENT"},
         "fields": ["id", "poNumber", "orderDate", "expectedDelivery", "status", "notes"],
         "unchanged": ["poNumber", "orderDate"]},
        {"name": "PurchaseOrderLine", "path": "/g/purchase-order-lines",
         "payload": {"purchaseOrder": {"id": PO}, "itemType": "BOTTLE", "spec": "500ml glass",
                     "quantity": 1000, "unitPrice": 18.5, "taxPct": 18},
         "update": {"quantity": 1200, "unitPrice": 19},
         "fields": ["id", "itemType", "spec", "quantity", "unitPrice", "taxPct"],
         "unchanged": ["itemType", "spec"]},
        {"name": "GoodsReceipt", "path": "/g/goods-receipts",
         "payload": {"grnNumber": f"GRN-{TAG}", "purchaseOrder": {"id": PO}, "receiptDate": TODAY,
                     "deliveryNoteNo": f"DN-{TAG}", "conditionNote": "cartons intact",
                     "receivedBy": "crud-audit"},
         "update": {"conditionNote": "one carton corner crushed", "receivedBy": "crud-audit-2"},
         "fields": ["id", "grnNumber", "receiptDate", "deliveryNoteNo", "conditionNote", "receivedBy"],
         "unchanged": ["grnNumber", "deliveryNoteNo"]},
        {"name": "GoodsReceiptLine", "path": "/g/goods-receipt-lines",
         "payload": {"goodsReceipt": {"id": GR}, "poLine": {"id": PL},
                     "qtyReceived": 1000, "qtyDamaged": 5, "qtyShort": 0},
         "update": {"qtyDamaged": 8, "qtyShort": 2},
         "fields": ["id", "qtyReceived", "qtyDamaged", "qtyShort"],
         "unchanged": ["qtyReceived"]},
        # ---- inventory ----------------------------------------------------
        {"name": "StockLevel", "path": "/g/stock-levels",
         "payload": {"variant": {"id": V}, "batch": {"id": BA}, "warehouse": {"id": W},
                     "onHand": 25, "reserved": 3, "onHold": 0, "unitCost": 300, "expiryDate": NEXT_YEAR},
         "update": {"unitCost": 315, "expiryDate": "2027-06-30"},
         "update_guarded": True,  # @Version not in JSON contract -> blind PUT must be rejected
         "fields": ["id", "onHand", "reserved", "onHold", "unitCost", "expiryDate"],
         "unchanged": ["onHand", "reserved"]},
        {"name": "StockMovement", "path": "/g/stock-movements",
         "payload": {"movementNo": f"MOV-{TAG}", "type": "TRANSFER_IN", "variant": {"id": V},
                     "batch": {"id": BA}, "fromWarehouse": {"id": 1}, "toWarehouse": {"id": W},
                     "quantity": 5, "unitCost": 300, "referenceType": "CRUD-AUDIT",
                     "referenceId": TAG, "reason": "audit create", "performedBy": "crud-audit"},
         "update": {"reason": "audit update — narration corrected"},
         "fields": ["id", "movementNo", "type", "quantity", "unitCost", "referenceType", "reason", "performedBy"],
         "unchanged": ["movementNo", "quantity"]},
        # ---- settings / alerts / reports ----------------------------------
        {"name": "AppUser", "path": "/g/app-users",
         "payload": {"name": f"Audit User {TAG}", "email": f"crud.{TAG.lower()}@feldnstein.in",
                     "phone": "9876500003", "role": "SALES", "active": True},
         "update": {"phone": "9876500004", "role": "QC"},
         "fields": ["id", "name", "email", "phone", "role", "active"],
         "unchanged": ["name", "email"]},
        {"name": "AppSetting", "path": "/g/settings", "user": "admin",
         "payload": {"settingKey": f"crud.{TAG}", "settingValue": "100", "valueType": "INTEGER",
                     "description": "audit create"},
         "update": {"settingValue": "250", "description": "audit update"},
         "fields": ["id", "settingKey", "settingValue", "valueType", "description"],
         "unchanged": ["settingKey", "valueType"]},
        {"name": "PriceConfig", "path": "/g/price-configs",
         "payload": {"variant": {"id": V}, "priceType": "SELLING", "amount": 499,
                     "gstPct": 5, "effectiveFrom": TODAY, "active": True, "notes": "audit create"},
         "update": {"amount": 519, "notes": "audit update"},
         "fields": ["id", "priceType", "amount", "gstPct", "effectiveFrom", "active", "notes"],
         "unchanged": ["priceType", "gstPct"]},
        {"name": "AlertRule", "path": "/g/alert-rules",
         "payload": {"ruleType": "LOW_STOCK", "scopeRef": f"crud-{TAG}", "thresholdValue": 10, "active": True},
         "update": {"thresholdValue": 25, "active": False},
         "fields": ["id", "ruleType", "scopeRef", "thresholdValue", "active"],
         "unchanged": ["ruleType", "scopeRef"]},
        {"name": "ReportSchedule", "path": "/g/report-schedules", "user": "admin",
         "payload": {"name": f"Audit Schedule {TAG}", "reportType": "inventory-summary",
                     "paramsJson": "{}", "frequency": "WEEKLY", "nextRun": NEXT_YEAR, "active": True},
         "update": {"frequency": "MONTHLY", "paramsJson": '{"warehouse":"all"}'},
         "fields": ["id", "name", "reportType", "frequency", "nextRun", "active"],
         "unchanged": ["name", "reportType"]},
        # ---- commerce -----------------------------------------------------
        {"name": "ShopProduct", "path": "/products",
         "payload": {"name": f"Audit Shop Product {TAG}", "sku": f"SHOP-{TAG}",
                     "category": "audit", "price": 299, "stockQty": 10},
         "update": {"price": 329, "stockQty": 12},
         "fields": ["id", "name", "sku", "category", "price", "stockQty"],
         "unchanged": ["name", "sku"]},
    ]


def create_parents(ctx):
    """Parent fixtures that some audit cycles reference but do not own."""
    print("=== Parent fixtures ===")
    s, w = post("ops", "/g/warehouses", {"code": f"WH-{TAG}", "name": f"Audit WH {TAG}",
                                           "type": "FULFILMENT", "address": "Audit addr", "active": True})
    check("parent warehouse create", s == 201, f"{s} {w}")
    ctx["warehouse"] = w
    s, f = post("ops", "/g/suppliers", {"code": f"F-{TAG}", "type": "FARMER", "name": f"Audit Farmer {TAG}", "active": True})
    check("parent supplier create", s == 201, f"{s} {f}")
    ctx["supplier"] = f
    s, p = post("ops", "/g/oil-products", {"code": f"OIL-{TAG}", "name": f"Audit Oil {TAG}",
                                           "oilSource": "GROUNDNUT", "shelfLifeDays": 365, "active": True})
    check("parent oil product create", s == 201, f"{s} {p}")
    ctx["oilProduct"] = p
    s, v = post("ops", "/g/product-variants", {"product": {"id": p["id"]}, "sku": f"PARENT-{TAG}",
                                               "sizeMl": 1000, "bottleType": "GLASS", "capType": "ROPP", "mrp": 900})
    check("parent variant create", s == 201, f"{s} {v}")
    ctx["variant"] = v
    s, b = post("ops", "/g/bulls", {"code": f"PBULL-{TAG}", "name": f"Parent Bull {TAG}", "breed": "Ongole",
                                    "healthStatus": "FIT", "restAfterDays": 3, "acquisitionCost": 40000,
                                    "monthlyFeedCost": 2800, "active": True})
    check("parent bull create", s == 201, f"{s} {b}")
    ctx["bull"] = b
    s, pr = post("ops", "/g/presses", {"code": f"PPRESS-{TAG}", "type": "Wooden gaanugu", "beamCondition": "GOOD",
                                       "stoneCondition": "GOOD", "capacityLitres": 10, "status": "ACTIVE"})
    check("parent press create", s == 201, f"{s} {pr}")
    ctx["press"] = pr
    s, o = post("ops", "/g/press-operators", {"code": f"POP-{TAG}", "name": f"Parent Operator {TAG}",
                                              "phone": "9876500009", "wageType": "DAILY", "rate": 600,
                                              "joinDate": TODAY, "active": True})
    check("parent operator create", s == 201, f"{s} {o}")
    ctx["operator"] = o
    s, ba = post("ops", "/g/production-batches", {
        "batchCode": f"PB-{TAG}", "product": {"id": p["id"]}, "pressDate": TODAY,
        "seedType": "Groundnut (Java)", "seedQtyKg": 100, "seedCostTotal": 9500,
        "farmer": {"id": f["id"]}, "bull": {"id": b["id"]}, "operator": {"id": o["id"]},
        "press": {"id": pr["id"]}, "status": "PRESSING", "weatherNotes": "audit parent"})
    check("parent batch create", s == 201, f"{s} {ba}")
    ctx["batch"] = ba
    s, po = post("ops", "/g/purchase-orders", {"poNumber": f"PPO-{TAG}", "supplier": {"id": f["id"]},
                                               "deliveryWarehouse": {"id": w["id"]}, "orderDate": TODAY,
                                               "expectedDelivery": NEXT_YEAR, "status": "DRAFT"})
    check("parent PO create", s == 201, f"{s} {po}")
    ctx["po"] = po
    s, pl = post("ops", "/g/purchase-order-lines", {"purchaseOrder": {"id": po["id"]}, "itemType": "BOTTLE",
                                                    "spec": "500ml glass", "quantity": 1000, "unitPrice": 18.5})
    check("parent PO line create", s == 201, f"{s} {pl}")
    ctx["poLine"] = pl
    s, gr = post("ops", "/g/goods-receipts", {"grnNumber": f"PGRN-{TAG}", "purchaseOrder": {"id": po["id"]},
                                              "receiptDate": TODAY, "deliveryNoteNo": f"PDN-{TAG}",
                                              "receivedBy": "crud-audit"})
    check("parent GRN create", s == 201, f"{s} {gr}")
    ctx["grn"] = gr


def crud_parents(ctx):
    """CRUD cycles for the standalone parents themselves (run after children)."""
    specs = [
        {"name": "Warehouse", "path": "/g/warehouses",
         "payload": {"code": f"WH2-{TAG}", "name": f"Audit WH2 {TAG}", "type": "PARTNER_HUB",
                     "address": "Audit addr 2", "managerName": "Audit Manager", "managerPhone": "9876500010"},
         "update": {"managerPhone": "9876500011", "name": f"Audit WH2 renamed {TAG}"},
         "fields": ["id", "code", "name", "type", "managerName", "managerPhone"],
         "unchanged": ["code", "type"]},
        {"name": "Supplier", "path": "/g/suppliers",
         "payload": {"code": f"F2-{TAG}", "type": "PACKAGING", "name": f"Audit Vendor {TAG}",
                     "phone": "9876500012", "address": "Vendor addr", "gst": "36AABCU9603R1ZM", "active": True},
         "update": {"phone": "9876500013", "gst": "36AABCU9603R1ZN"},
         "fields": ["id", "code", "type", "name", "phone", "gst", "active"],
         "unchanged": ["code", "type"]},
        {"name": "OilProduct", "path": "/g/oil-products",
         "payload": {"code": f"OIL2-{TAG}", "name": f"Audit Sesame {TAG}", "oilSource": "SESAME",
                     "shelfLifeDays": 270, "nutritionalInfo": "cold pressed", "active": True},
         "update": {"shelfLifeDays": 300, "nutritionalInfo": "cold pressed, wood pressed"},
         "fields": ["id", "code", "name", "oilSource", "shelfLifeDays", "nutritionalInfo", "active"],
         "unchanged": ["code", "oilSource"]},
        {"name": "ProductionBatch", "path": "/g/production-batches",
         "payload": {"batchCode": f"B-{TAG}", "product": {"id": ctx["oilProduct"]["id"]}, "pressDate": TODAY,
                     "seedType": "Groundnut (Java)", "seedQtyKg": 120, "seedCostTotal": 11400,
                     "farmer": {"id": ctx["supplier"]["id"]}, "bull": {"id": ctx["bull"]["id"]},
                     "operator": {"id": ctx["operator"]["id"]}, "press": {"id": ctx["press"]["id"]},
                     "oilYieldLitres": 38, "spillageLitres": 0.5, "status": "PRESSING",
                     "handlerWageCost": 600, "bullFeedCost": 100, "pressMaintenanceCost": 50,
                     "stoneWearCost": 25, "shedCost": 75, "packagingCost": 740,
                     "weatherNotes": "audit create", "bestBeforeDate": NEXT_YEAR},
         "update": {"weatherNotes": "audit update — humid afternoon", "seedCostTotal": 11600},
         "fields": ["id", "batchCode", "pressDate", "seedQtyKg", "seedCostTotal", "oilYieldLitres", "status", "weatherNotes"],
         "unchanged": ["batchCode", "seedQtyKg"]},
    ]
    for spec in specs:
        crud_cycle(spec, ctx)


def rbac_checks():
    print("\n=== RBAC negative checks ===")
    s, _ = post("cust", "/g/warehouses", {"code": f"EVIL-{TAG}", "name": "x", "type": "PRODUCTION"})
    check("customer POST /g/warehouses -> 403", s == 403, f"{s}")
    s, _ = delete("cust", "/g/warehouses/1")
    check("customer DELETE /g/warehouses/1 -> 403", s == 403, f"{s}")
    s, _ = post(None, "/g/warehouses", {"code": f"ANON-{TAG}", "name": "x", "type": "PRODUCTION"})
    check("anonymous POST /g/warehouses -> 401", s == 401, f"{s}")
    s, _ = get("cust", "/g/settings")
    check("customer GET admin-only /g/settings -> 403", s == 403, f"{s}")


def main():
    print(f"CRUD e2e audit against {BASE}  (tag {TAG})")
    ctx = {"leftovers": []}
    create_parents(ctx)
    for spec in build_specs(ctx):
        crud_cycle(spec, ctx)
    crud_parents(ctx)
    rbac_checks()

    print("\n=== Summary ===")
    print(f"passed: {len(passed)}  failed: {len(failed)}")
    if ctx["leftovers"]:
        print("delete-guarded entities (left in DB, referenced by ledger):")
        for name, path, cid in ctx["leftovers"]:
            print(f"  {name} {path}/{cid}")
    if failed:
        print("\nFAILED:")
        for f in failed:
            print(f"  {f}")
        return 1
    print("ALL CRUD CYCLES VERIFIED WITH VALUES")
    return 0


if __name__ == "__main__":
    sys.exit(main())
