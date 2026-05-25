from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from rest_framework.authtoken.models import Token

from billing.models import (
    Bill,
    BillLine,
    GenerationRun,
    InventoryItem,
    Item,
    Shop,
    UserItem,
    UserProfile,
    UserSelectedCategory,
)


class Command(BaseCommand):
    help = "Delete all application/user data except Item rows, then recreate the admin account."

    def handle(self, *args, **options):
        admin_email = "vyapaarbills@gmail.com"
        admin_password = "Sainit@9192"

        self.stdout.write("Detaching Item foreign keys so the Item table is preserved...")
        Item.objects.update(owner=None, shop=None, created_by=None)

        self.stdout.write("Cleaning billing, shop, inventory, user, and token data...")
        BillLine.objects.all().delete()
        Bill.objects.all().delete()
        GenerationRun.objects.all().delete()
        InventoryItem.objects.all().delete()
        UserItem.objects.all().delete()
        UserSelectedCategory.objects.all().delete()
        Shop.objects.all().delete()
        UserProfile.objects.all().delete()
        Token.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write(f"Creating admin account: {admin_email}")
        admin = User.objects.create_superuser(
            username=admin_email,
            email=admin_email,
            password=admin_password,
        )
        UserProfile.objects.create(
            user=admin,
            phone_number="9133410628",
            annual_income=Decimal("0.00"),
            plan=UserProfile.BASIC,
            custom_plan_price=None,
            custom_monthly_runs=None,
            amount_paid=Decimal("0.00"),
            is_active=True,
        )

        self.stdout.write(self.style.SUCCESS("Database cleaned. Item rows preserved and admin account recreated."))
