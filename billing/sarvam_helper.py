import os
import random
import json
import requests
from decimal import Decimal
from django.conf import settings
from billing.models import Item

def calculate_ean13_checksum(code_str):
    # code_str is a 12-digit string
    sum_even = sum(int(code_str[i]) for i in range(1, 12, 2))
    sum_odd = sum(int(code_str[i]) for i in range(0, 12, 2))
    total = sum_odd + sum_even * 3
    checksum = (10 - (total % 10)) % 10
    return str(checksum)

def generate_unique_barcode():
    # Gather all existing barcodes in DB
    existing_barcodes = set(Item.objects.filter(barcode__isnull=False).values_list("barcode", flat=True))
    while True:
        base = "890" + "".join(str(random.randint(0, 9)) for _ in range(9))
        checksum = calculate_ean13_checksum(base)
        barcode = base + checksum
        if barcode not in existing_barcodes:
            return barcode

def local_fallback_normalize(raw_name, unit_of_measure):
    """
    Intelligent local heuristic parser that maps raw items to standard HSN, categories, and GST rates.
    """
    name_lower = raw_name.lower().strip()
    uom_lower = unit_of_measure.lower().strip()
    
    # Capitalize input beautifully
    norm_name = " ".join([w.capitalize() for w in name_lower.split()])
    if uom_lower and uom_lower != "none":
        norm_name = f"{norm_name} {unit_of_measure}"
        
    category = "Misc"
    hsn_code = "9999"
    gst_percent = Decimal("18.00")

    # Match rules
    if "rice" in name_lower:
        category = "Grocery Staples / Rice"
        hsn_code = "1006"
        gst_percent = Decimal("5.00")
    elif "dal" in name_lower or "toor" in name_lower or "pulse" in name_lower or "gram" in name_lower:
        category = "Grocery Staples / Pulses"
        hsn_code = "0713"
        gst_percent = Decimal("5.00")
    elif "atta" in name_lower or "wheat" in name_lower or "flour" in name_lower or "maida" in name_lower:
        category = "Grocery Staples / Atta & Flours"
        hsn_code = "1101"
        gst_percent = Decimal("5.00")
    elif "oil" in name_lower:
        category = "Grocery Staples / Oils"
        hsn_code = "1512"
        gst_percent = Decimal("5.00")
    elif "sugar" in name_lower:
        category = "Grocery Staples / Sugar"
        hsn_code = "1701"
        gst_percent = Decimal("5.00")
    elif "salt" in name_lower:
        category = "Grocery Staples / Salts"
        hsn_code = "2501"
        gst_percent = Decimal("0.00")
    elif "milk" in name_lower or "curd" in name_lower or "paneer" in name_lower or "dairy" in name_lower:
        category = "Dairy & Frozen / Milk"
        hsn_code = "0401"
        gst_percent = Decimal("0.00") if "milk" in name_lower else Decimal("5.00")
    elif "ghee" in name_lower:
        category = "Dairy & Frozen / Butter & Cream"
        hsn_code = "0405"
        gst_percent = Decimal("12.00")
    elif "soap" in name_lower or "shampoo" in name_lower or "face wash" in name_lower or "body wash" in name_lower:
        category = "Personal Care / Soaps"
        hsn_code = "3401"
        gst_percent = Decimal("18.00")
    elif "shirt" in name_lower or "pant" in name_lower or "trouser" in name_lower or "kurti" in name_lower or "jeans" in name_lower or "t-shirt" in name_lower or "dress" in name_lower:
        if "men" in name_lower:
            category = "Readymade / Mens Wear"
        elif "women" in name_lower or "kurti" in name_lower or "saree" in name_lower:
            category = "Readymade / Womens Wear"
        elif "kids" in name_lower or "baby" in name_lower:
            category = "Readymade / Kids Wear"
        else:
            category = "Readymade / Mens Wear"
        hsn_code = "6203" if "pant" in name_lower or "trouser" in name_lower or "jeans" in name_lower else "6205"
        gst_percent = Decimal("5.00")
    elif "lipstick" in name_lower or "eyeliner" in name_lower or "nail polish" in name_lower or "makeup" in name_lower:
        category = "Fancy / Cosmetics"
        hsn_code = "3304"
        gst_percent = Decimal("18.00")
    elif "toy" in name_lower or "game" in name_lower or "doll" in name_lower:
        category = "Fancy / Toys"
        hsn_code = "9503"
        gst_percent = Decimal("12.00")
    elif "necklace" in name_lower or "ring" in name_lower or "bangle" in name_lower or "earring" in name_lower or "jewel" in name_lower:
        category = "Fancy / Jewellery"
        hsn_code = "7117"
        gst_percent = Decimal("3.00")
    elif "biscuit" in name_lower or "cookie" in name_lower:
        category = "Packaged Foods / Biscuits"
        hsn_code = "1905"
        gst_percent = Decimal("18.00")
    elif "tea" in name_lower or "coffee" in name_lower:
        category = "Beverages / Tea" if "tea" in name_lower else "Beverages / Coffee"
        hsn_code = "0902" if "tea" in name_lower else "0901"
        gst_percent = Decimal("5.00")

    return {
        "normalized_name": norm_name,
        "category": category,
        "hsn_code": hsn_code,
        "gst_percent": gst_percent
    }

def analyze_item_with_sarvam(raw_name, unit_of_measure):
    """
    Search product information using Sarvam AI chat completions. Falls back to local heuristics if fails.
    """
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        return local_fallback_normalize(raw_name, unit_of_measure)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Standard prompt for Sarvam-M or general OpenAI compatible completions
    prompt = f"""
    You are an intelligent retail billing product classifier for Indian shops.
    Given a raw product name and unit of measure input by a shopkeeper, you must:
    1. Normalize the product name professionally (e.g. capitalize correctly, remove duplicate details).
    2. Classify it into a standard retail category. Examples:
       - 'Grocery Staples / Rice'
       - 'Grocery Staples / Pulses'
       - 'Dairy & Frozen / Milk'
       - 'Personal Care / Soaps'
       - 'Readymade / Mens Wear'
       - 'Readymade / Womens Wear'
       - 'Fancy / Cosmetics'
       - 'Fancy / Jewellery'
       - 'Fancy / Toys'
       - 'Packaged Foods / Biscuits'
    3. Identify its likely 4-digit or 6-digit Indian HSN code (e.g. 1006 for Rice, 0401 for Milk, 6203 for Shirts).
    4. Determine the valid Indian GST percentage rate for this category (e.g. 0.00, 3.00, 5.00, 12.00, 18.00, 28.00).

    Raw Name: "{raw_name}"
    Unit of Measure: "{unit_of_measure}"

    Return the result strictly as a JSON object with keys:
    "normalized_name" (string), "category" (string), "hsn_code" (string), and "gst_percent" (number/float).
    Do not return any other text, markdown blocks, or explanation.
    """

    data = {
        "model": "sarvam-2b-v0.5",  # Sarvam OpenAI-compatible model
        "messages": [
            {"role": "system", "content": "You are a helpful retail expert that returns strictly raw JSON data."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1
    }

    try:
        # Call the chat completions API
        response = requests.post("https://api.sarvam.ai/v1/chat/completions", headers=headers, json=data, timeout=6)
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"]
            # Clean possible markdown surrounding json
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            result = json.loads(content)
            
            # Map values back, ensuring decimals
            return {
                "normalized_name": str(result.get("normalized_name", raw_name)),
                "category": str(result.get("category", "Misc")),
                "hsn_code": str(result.get("hsn_code", "9999")),
                "gst_percent": Decimal(str(result.get("gst_percent", "18.00")))
            }
    except Exception as e:
        print("Sarvam API failed, falling back to local processing:", e)

    return local_fallback_normalize(raw_name, unit_of_measure)
