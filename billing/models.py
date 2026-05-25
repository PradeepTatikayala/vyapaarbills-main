from decimal import Decimal
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class UserProfile(models.Model):
    BASIC = "basic"
    MEDIUM = "medium"
    CUSTOM = "custom"
    PLAN_CHOICES = [
        (BASIC, "Basic"),
        (MEDIUM, "Medium"),
        (CUSTOM, "Custom"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone_number = models.CharField(max_length=20)
    annual_income = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=BASIC)
    custom_plan_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    custom_monthly_runs = models.PositiveIntegerField(null=True, blank=True)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.user.email

    @property
    def total_amount_due(self):
        if self.plan == self.BASIC:
            return Decimal("1.00")
        elif self.plan == self.MEDIUM:
            return Decimal("2500.00")
        elif self.plan == self.CUSTOM:
            return self.custom_plan_price or Decimal("0.00")
        return Decimal("0.00")

    @property
    def pending_amount(self):
        return self.total_amount_due - self.amount_paid

    @property
    def registered_date(self):
        return self.user.date_joined.date()

    @property
    def billing_date(self):
        return self.registered_date + timedelta(days=30)

    @property
    def payment_due_date(self):
        return self.billing_date + timedelta(days=3)

    @property
    def is_payment_overdue(self):
        return self.pending_amount > Decimal("0.00") and timezone.localdate() > self.payment_due_date

    @property
    def allowed_runs(self):
        if self.plan == self.BASIC:
            return 3
        elif self.plan == self.MEDIUM:
            return 5
        elif self.plan == self.CUSTOM:
            return self.custom_monthly_runs or 0
        return 0


class Shop(models.Model):
    GENERAL = "general"
    FANCY = "fancy"
    READYMADE = "readymade"
    SHOP_TYPES = [
        (GENERAL, "General Store"),
        (FANCY, "Fancy Shop"),
        (READYMADE, "Readymade Shop"),
    ]

    REGULAR = "regular"
    COMPOSITE = "composite"
    DEALER_TYPES = [
        (REGULAR, "Regular Dealer"),
        (COMPOSITE, "Composite Dealer"),
    ]

    name = models.CharField(max_length=160)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shops", null=True, blank=True)
    shop_type = models.CharField(max_length=20, choices=SHOP_TYPES)
    dealer_type = models.CharField(max_length=20, choices=DEALER_TYPES, default=REGULAR)
    address = models.TextField()
    gst_number = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Item(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_items", null=True, blank=True)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="items", null=True, blank=True)
    shop_type = models.CharField(max_length=20, choices=Shop.SHOP_TYPES, null=True, blank=True)
    name = models.CharField(max_length=180)
    category = models.CharField(max_length=120, null=True, blank=True)
    hsn_code = models.CharField(max_length=30, null=True, blank=True)
    unit_of_measure = models.CharField(max_length=20, default="pcs")
    barcode = models.CharField(max_length=50, null=True, blank=True)
    mrp = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_global = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name="created_items", null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} - {self.hsn_code or 'No HSN'}"


class UserSelectedCategory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="selected_categories")
    category = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "category")
        verbose_name_plural = "user selected categories"

    def __str__(self):
        return f"{self.user.username} - {self.category}"


class UserItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_items")
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="user_mappings")
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    mrp = models.DecimalField(max_digits=12, decimal_places=2)
    margin = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    stock_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "item")
        ordering = ["item__name"]

    def __str__(self):
        return f"{self.user.username} - {self.item.name} (Selling: {self.selling_price})"


class InventoryItem(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="inventory_items")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="inventory_items")
    buying_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    stock_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    net_worth = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "item")
        ordering = ["item__name"]

    def save(self, *args, **kwargs):
        self.net_worth = self.buying_price * self.stock_qty
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.item.name} (Stock: {self.stock_qty})"


class PaymentTransaction(models.Model):
    CREATED = "created"
    PAID = "paid"
    FAILED = "failed"
    STATUS_CHOICES = [
        (CREATED, "Created"),
        (PAID, "Paid"),
        (FAILED, "Failed"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payment_transactions")
    profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="payment_transactions")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    razorpay_order_id = models.CharField(max_length=120, unique=True)
    razorpay_payment_id = models.CharField(max_length=120, blank=True, default="")
    razorpay_signature = models.CharField(max_length=256, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=CREATED)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.amount} - {self.status}"


class GenerationRun(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="generation_runs")
    month = models.DateField()
    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    generated_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    remaining_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    bills_per_day = models.PositiveIntegerField(default=6)
    created_at = models.DateTimeField(auto_now_add=True)


class Bill(models.Model):
    generation_run = models.ForeignKey(GenerationRun, on_delete=models.CASCADE, related_name="bills", null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pos_bills", null=True, blank=True)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="pos_bills", null=True, blank=True)
    is_pos = models.BooleanField(default=False)
    bill_no = models.CharField(max_length=32, unique=True)
    customer_name = models.CharField(max_length=120)
    bill_date = models.DateField()
    taxable_value = models.DecimalField(max_digits=14, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=14, decimal_places=2)
    sgst_amount = models.DecimalField(max_digits=14, decimal_places=2)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        ordering = ["bill_date", "bill_no"]


class BillLine(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="lines")
    item_name = models.CharField(max_length=180)
    hsn_code = models.CharField(max_length=30, blank=True, default="")
    quantity = models.PositiveIntegerField()
    unit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2)
    taxable_value = models.DecimalField(max_digits=14, decimal_places=2)
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=14, decimal_places=2)
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    sgst_amount = models.DecimalField(max_digits=14, decimal_places=2)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
