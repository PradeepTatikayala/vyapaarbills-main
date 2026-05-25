from django.core.management.base import BaseCommand

from billing.models import Item, Shop
from billing.services import readymade_tax


GENERAL_ITEMS = [
    ("Rice Sona Masoori 10 kg", 720, 5), ("Wheat Flour 5 kg", 260, 5),
    ("Toor Dal 1 kg", 165, 5), ("Sugar 1 kg", 48, 5), ("Salt 1 kg", 24, 0),
    ("Milk Packet 1 L", 56, 0), ("Bread Loaf", 45, 0), ("Tea Powder 500 g", 285, 5),
    ("Coffee Powder 200 g", 180, 5), ("Cooking Oil 1 L", 165, 5), ("Ghee 500 ml", 355, 12),
    ("Biscuits Family Pack", 75, 12), ("Chocolate Pack", 120, 28), ("Namkeen 400 g", 135, 12),
    ("Soap Pack of 4", 168, 12), ("Shampoo 340 ml", 245, 28), ("Toothpaste 200 g", 145, 12),
    ("Detergent Powder 2 kg", 235, 28), ("Floor Cleaner 1 L", 215, 28),
    ("Pressure Cooker 5 L", 2450, 12), ("Mixer Grinder", 3950, 28), ("Soft Drink 2 L", 105, 28),
    ("Pan Masala Pack", 220, 40),
]

READYMADE_ITEMS = [
    ("Men Cotton Shirt", 899), ("Men Formal Trouser", 1299), ("Women Kurti", 999),
    ("Women Leggings", 399), ("Kids T-Shirt", 349), ("Kids Jeans", 799),
    ("Saree Cotton", 1499), ("Saree Silk Blend", 3499), ("Dupatta", 299),
    ("Night Wear Set", 699), ("Sports T-Shirt", 599), ("Jacket", 2499),
    ("Blazer", 4999), ("Belt", 499), ("Wallet", 699), ("Cap", 249),
    ("Socks Pack", 199), ("Premium Handbag", 2999), ("Luxury Dress Material", 5999),
    ("Designer Bridal Set", 14999),
]


class Command(BaseCommand):
    help = "Seed default general store and readymade shop items"

    def handle(self, *args, **options):
        for name, mrp, gst in GENERAL_ITEMS:
            Item.objects.update_or_create(
                shop_type=Shop.GENERAL,
                name=name,
                defaults={"mrp": mrp, "gst_percent": gst, "is_active": True},
            )

        for name, mrp in READYMADE_ITEMS:
            Item.objects.update_or_create(
                shop_type=Shop.READYMADE,
                name=name,
                defaults={"mrp": mrp, "gst_percent": readymade_tax(mrp), "is_active": True},
            )

        self.stdout.write(self.style.SUCCESS("Seeded default items"))
