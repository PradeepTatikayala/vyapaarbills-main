import calendar
import random
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from .models import Bill, BillLine, GenerationRun, Item, Shop, UserItem

CUSTOMER_NAMES = [
    "Aarav Sharma", "Vivaan Reddy", "Aditya Iyer", "Sai Kumar", "Arjun Nair",
    "Reyansh Patel", "Mohammed Imran", "Krishna Rao", "Rohan Mehta", "Karthik Shetty",
    "Ananya Gupta", "Diya Singh", "Saanvi Joshi", "Ishita Verma", "Meera Menon",
    "Priya Das", "Sneha Kulkarni", "Lakshmi Prasad", "Fatima Khan", "Nisha Agarwal",
    "Rahul Choudhary", "Manish Jain", "Suresh Babu", "Vikram Malhotra", "Harish Gowda",
    "Pooja Mishra", "Kavya Murthy", "Neha Saxena", "Ritika Bose", "Deepa Krishnan",
    "Akash Yadav", "Naveen Pillai", "Girish Naidu", "Prakash Rao", "Sameer Ansari",
    "Amit Tiwari", "Varun Desai", "Kiran Patil", "Rajesh Nambiar", "Vijay Kumar",
]

TWOPLACES = Decimal("0.01")


def money(value):
    return Decimal(value).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def readymade_tax(mrp):
    return Decimal("12.00") if money(mrp) > Decimal("1000.00") else Decimal("5.00")


def normalize_item(shop_type, item):
    mrp = money(item["mrp"])
    gst_percent = readymade_tax(mrp) if shop_type == Shop.READYMADE else money(item.get("gst_percent", 5))
    return {
        "name": item["name"],
        "hsn_code": item.get("hsn_code") or "",
        "mrp": mrp,
        "gst_percent": gst_percent,
    }


def split_target(total, count, rng):
    weights = [Decimal(str(0.55 + rng.random() * 0.9)) for _ in range(count)]
    weight_sum = sum(weights)
    remaining = money(total)
    parts = []
    for index, weight in enumerate(weights):
        if index == count - 1:
            parts.append(remaining)
        else:
            amount = money((money(total) * weight) / weight_sum)
            parts.append(amount)
            remaining = money(remaining - amount)
    return parts


def calculate_line(item, quantity, is_composite=False):
    total = money(item["mrp"] * quantity)
    if is_composite:
        taxable = total
        tax_amount = Decimal("0.00")
        cgst_amount = Decimal("0.00")
        sgst_amount = Decimal("0.00")
        rate = Decimal("0.00")
        gst_percent = Decimal("0.00")
    else:
        taxable = money(total / (Decimal("1.00") + item["gst_percent"] / Decimal("100.00")))
        tax_amount = money(total - taxable)
        cgst_amount = money(tax_amount / 2)
        sgst_amount = money(tax_amount - cgst_amount)
        rate = money(item["gst_percent"] / 2)
        gst_percent = item["gst_percent"]

    return {
        "item_name": item["name"],
        "hsn_code": item.get("hsn_code") or "",
        "quantity": quantity,
        "unit_amount": item["mrp"],
        "gst_percent": gst_percent,
        "taxable_value": taxable,
        "cgst_rate": rate,
        "cgst_amount": cgst_amount,
        "sgst_rate": rate,
        "sgst_amount": sgst_amount,
        "total_amount": total,
    }


def build_bill_lines(catalog, target, rng, is_composite=False):
    sorted_catalog = sorted(catalog, key=lambda item: item["mrp"])
    min_price = sorted_catalog[0]["mrp"]
    selected = [item for item in rng.sample(catalog, len(catalog)) if item["mrp"] <= target][:20]
    quantities = {}
    remaining = money(target)

    for index, item in enumerate(selected):
        if remaining < min_price:
            break
        remaining_slots = max(1, len(selected) - index)
        share = remaining / remaining_slots
        quantity = max(1, int(share / item["mrp"]))
        gross = money(item["mrp"] * quantity)
        if gross <= remaining:
            quantities[item["name"]] = quantities.get(item["name"], 0) + quantity
            remaining = money(remaining - gross)

    attempts = 0
    while remaining >= min_price and attempts < 300:
        affordable = [item for item in sorted_catalog if item["mrp"] <= remaining]
        if not affordable:
            break
        item = rng.choice(affordable)
        quantities[item["name"]] = quantities.get(item["name"], 0) + 1
        remaining = money(remaining - item["mrp"])
        attempts += 1

    lines = []
    for item in catalog:
        quantity = quantities.get(item["name"])
        if quantity:
            lines.append(calculate_line(item, quantity, is_composite))
    return lines[:20]


from rest_framework import exceptions
from django.utils import timezone


@transaction.atomic
def generate_bills(payload, user=None):
    if user:
        profile = getattr(user, "profile", None)
        if profile:
            if not profile.is_active:
                raise exceptions.PermissionDenied("User account is inactive. Please contact admin.")

            # Check monthly run limit
            month_start = payload["month"].replace(day=1)
            runs_count = GenerationRun.objects.filter(
                shop__owner=user,
                created_at__year=timezone.now().year,
                created_at__month=timezone.now().month
            ).count()

            if runs_count >= profile.allowed_runs:
                raise exceptions.PermissionDenied(f"Monthly run limit reached ({profile.allowed_runs}).")

            # Check 6 month range (within +/- 3 months of today)
            today = date.today()
            month_diff = (payload["month"].year - today.year) * 12 + payload["month"].month - today.month
            if abs(month_diff) > 3:
                raise exceptions.ValidationError("Bill generation is only allowed within a 6-month range around the current date.")

    # Locate or create the shop first
    shop = None
    if payload.get("shop_id") and user:
        shop = Shop.objects.filter(id=payload["shop_id"], owner=user).first()
    
    if shop:
        shop.name = payload["shop_name"]
        shop.shop_type = payload["shop_type"]
        shop.address = payload["address"]
        shop.save()
    else:
        shop = Shop.objects.create(
            owner=user,
            name=payload["shop_name"],
            shop_type=payload["shop_type"],
            address=payload["address"],
            gst_number=payload["gst_number"],
        )

    is_composite = (shop.dealer_type == Shop.COMPOSITE)

    # Build the product catalog
    # 1. Fetch active items mapped to this user in UserItem
    user_items = UserItem.objects.filter(user=user, is_active=True).select_related("item")
    catalog = []
    
    if user_items.exists():
        for ui in user_items:
            mrp = ui.selling_price  # Bill at the user's custom selling_price
            gst = ui.item.gst_percent or Decimal("5.00")
            if payload["shop_type"] == Shop.READYMADE:
                gst = readymade_tax(mrp)
            catalog.append({
                "name": ui.item.name,
                "hsn_code": ui.item.hsn_code or "",
                "mrp": mrp,
                "gst_percent": gst
            })
    else:
        # Fallback to global master items if user hasn't onboarded yet
        master_items = Item.objects.filter(is_global=True, is_active=True, shop_type=payload["shop_type"])
        for item in master_items:
            mrp = item.mrp or Decimal("100.00")
            gst = item.gst_percent or Decimal("5.00")
            if payload["shop_type"] == Shop.READYMADE:
                gst = readymade_tax(mrp)
            catalog.append({
                "name": item.name,
                "hsn_code": item.hsn_code or "",
                "mrp": mrp,
                "gst_percent": gst
            })

    # Clean catalog
    catalog = [c for c in catalog if c["name"] and Decimal(c["mrp"]) > 0]

    rng = random.Random(str(payload["target_amount"]) + payload["shop_type"] + str(payload["month"]))
    days = calendar.monthrange(payload["month"].year, payload["month"].month)[1]
    bill_count = days * payload["bills_per_day"]
    targets = split_target(payload["target_amount"], bill_count, rng)
    names = CUSTOMER_NAMES[:]
    rng.shuffle(names)

    run = GenerationRun.objects.create(
        shop=shop,
        month=payload["month"].replace(day=1),
        target_amount=payload["target_amount"],
        bills_per_day=payload["bills_per_day"],
    )

    total_generated = Decimal("0.00")
    bill_number_start = Bill.objects.count() + 1
    for index, target in enumerate(targets):
        bill_day = (index // payload["bills_per_day"]) + 1
        bill_date = date(payload["month"].year, payload["month"].month, bill_day)
        lines = build_bill_lines(catalog, target, rng, is_composite)
        if not lines:
            continue

        taxable = money(sum(line["taxable_value"] for line in lines))
        cgst = money(sum(line["cgst_amount"] for line in lines))
        sgst = money(sum(line["sgst_amount"] for line in lines))
        total = money(sum(line["total_amount"] for line in lines))
        if total_generated + total > payload["target_amount"]:
            continue

        bill = Bill.objects.create(
            generation_run=run,
            bill_no=f"B{bill_number_start + index:05d}",
            customer_name=names[index % len(names)],
            bill_date=bill_date,
            taxable_value=taxable,
            cgst_amount=cgst,
            sgst_amount=sgst,
            total_amount=total,
        )
        BillLine.objects.bulk_create([BillLine(bill=bill, **line) for line in lines])
        total_generated = money(total_generated + total)

    run.generated_amount = total_generated
    run.remaining_amount = money(payload["target_amount"] - total_generated)
    run.save(update_fields=["generated_amount", "remaining_amount"])

    return run


from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet


def generate_pdf(run):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    # Shop Info
    elements.append(Paragraph(f"<b>{run.shop.name}</b>", styles["Title"]))
    elements.append(Paragraph(run.shop.address, styles["Normal"]))
    elements.append(Paragraph(f"GSTIN: {run.shop.gst_number}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph(f"Generation Run for {run.month.strftime('%B %Y')}", styles["Heading2"]))
    elements.append(Paragraph(f"Target: {run.target_amount} | Generated: {run.generated_amount}", styles["Normal"]))
    elements.append(Spacer(1, 10))

    is_composite = (run.shop.dealer_type == Shop.COMPOSITE)

    # Bills Summary Table
    bills = run.bills.all().prefetch_related("lines").order_by("bill_date", "bill_no")
    for bill in bills:
        elements.append(Paragraph(f"<b>Bill No: {bill.bill_no}</b> | Date: {bill.bill_date} | Customer: {bill.customer_name}", styles["Normal"]))
        
        if is_composite:
            data = [["Item", "HSN", "Qty", "Price", "Total"]]
            for line in bill.lines.all():
                data.append([
                    line.item_name,
                    line.hsn_code or "",
                    str(line.quantity),
                    str(line.unit_amount),
                    str(line.total_amount)
                ])
            data.append(["", "", "", "Total", str(bill.total_amount)])
            t = Table(data, colWidths=[200, 70, 40, 60, 80])
        else:
            data = [["Item", "HSN", "Qty", "MRP", "GST%", "Total"]]
            for line in bill.lines.all():
                data.append([
                    line.item_name,
                    line.hsn_code or "",
                    str(line.quantity),
                    str(line.unit_amount),
                    f"{line.gst_percent}%",
                    str(line.total_amount)
                ])
            data.append(["", "", "", "", "Total", str(bill.total_amount)])
            t = Table(data, colWidths=[170, 60, 35, 55, 45, 75])
        
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 15))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_pos_bills_pdf(user):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    shop = Shop.objects.filter(owner=user).first()
    shop_name = shop.name if shop else "VyapaarBills POS"
    shop_address = shop.address if shop else ""
    gst_number = shop.gst_number if shop else ""

    elements.append(Paragraph(f"<b>{shop_name}</b>", styles["Title"]))
    if shop_address:
        elements.append(Paragraph(shop_address, styles["Normal"]))
    if gst_number:
        elements.append(Paragraph(f"GSTIN: {gst_number}", styles["Normal"]))
    elements.append(Spacer(1, 16))
    elements.append(Paragraph("Inventory POS Bills", styles["Heading2"]))
    elements.append(Spacer(1, 10))

    bills = (
        Bill.objects
        .filter(user=user, is_pos=True)
        .prefetch_related("lines")
        .order_by("-bill_date", "-id")
    )

    if not bills.exists():
        elements.append(Paragraph("No inventory POS bills generated yet.", styles["Normal"]))
    else:
        for bill in bills:
            elements.append(Paragraph(f"<b>Bill No: {bill.bill_no}</b> | Date: {bill.bill_date} | Customer: {bill.customer_name}", styles["Normal"]))
            data = [["Item", "HSN", "Qty", "Rate", "GST%", "Total"]]
            for line in bill.lines.all():
                data.append([
                    line.item_name,
                    line.hsn_code or "",
                    str(line.quantity),
                    str(line.unit_amount),
                    f"{line.gst_percent}%",
                    str(line.total_amount),
                ])
            data.append(["", "", "", "", "Total", str(bill.total_amount)])
            table = Table(data, colWidths=[165, 60, 35, 55, 45, 80])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 15))

    doc.build(elements)
    buffer.seek(0)
    return buffer
