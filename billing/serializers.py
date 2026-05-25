from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from .models import Bill, BillLine, GenerationRun, Item, Shop, UserProfile, UserSelectedCategory, UserItem, InventoryItem


class SupportTicketSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=120)
    shop_name = serializers.CharField(max_length=160)
    shop_type = serializers.CharField(max_length=80)
    description = serializers.CharField(max_length=3000)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    phone_number = serializers.CharField(max_length=20)
    annual_income = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)

    def validate_email(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        income = validated_data.get("annual_income", 0)
        plan = UserProfile.BASIC
        if income > 30000000:
            plan = UserProfile.CUSTOM
        elif income >= 10000000:
            plan = UserProfile.MEDIUM

        UserProfile.objects.create(
            user=user,
            phone_number=validated_data["phone_number"],
            annual_income=income,
            plan=plan
        )
        token, _ = Token.objects.get_or_create(user=user)
        return {
            "token": token.key,
            "email": user.email,
            "phone_number": user.profile.phone_number,
            "is_admin": user.is_superuser
        }


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    role = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    shop_name = serializers.SerializerMethodField()
    gst_number = serializers.SerializerMethodField()
    total_amount_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    pending_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    allowed_runs = serializers.IntegerField(read_only=True)
    registered_date = serializers.DateField(read_only=True)
    billing_date = serializers.DateField(read_only=True)
    payment_due_date = serializers.DateField(read_only=True)
    is_payment_overdue = serializers.BooleanField(read_only=True)
    monthly_runs = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "email",
            "role",
            "is_admin",
            "shop_name",
            "gst_number",
            "phone_number",
            "annual_income",
            "plan",
            "custom_plan_price",
            "custom_monthly_runs",
            "amount_paid",
            "is_active",
            "total_amount_due",
            "pending_amount",
            "allowed_runs",
            "registered_date",
            "billing_date",
            "payment_due_date",
            "is_payment_overdue",
            "monthly_runs",
        ]

    def get_monthly_runs(self, obj):
        from django.utils import timezone
        now = timezone.now()
        return GenerationRun.objects.filter(
            shop__owner=obj.user,
            created_at__year=now.year,
            created_at__month=now.month
        ).count()

    def get_role(self, obj):
        return "admin" if obj.user.is_staff or obj.user.is_superuser else "customer"

    def get_is_admin(self, obj):
        return obj.user.is_staff or obj.user.is_superuser

    def get_shop_name(self, obj):
        shop = Shop.objects.filter(owner=obj.user).first()
        return shop.name if shop else ""

    def get_gst_number(self, obj):
        shop = Shop.objects.filter(owner=obj.user).first()
        return shop.gst_number if shop else ""


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs["email"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        user = validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        profile = getattr(user, "profile", None)
        return {
            "token": token.key,
            "email": user.email,
            "phone_number": profile.phone_number if profile else "",
            "is_admin": user.is_superuser
        }


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ["id", "name", "shop_type", "dealer_type", "address", "gst_number", "created_at"]


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = [
            "id",
            "shop",
            "shop_type",
            "name",
            "category",
            "hsn_code",
            "unit_of_measure",
            "barcode",
            "mrp",
            "gst_percent",
            "is_global",
            "is_active",
        ]
        read_only_fields = ["shop"]


class UserSelectedCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSelectedCategory
        fields = ["id", "category", "is_active"]


class UserItemSerializer(serializers.ModelSerializer):
    item_id = serializers.PrimaryKeyRelatedField(source="item", read_only=True)
    name = serializers.CharField(source="item.name", read_only=True)
    category = serializers.CharField(source="item.category", read_only=True)
    hsn_code = serializers.CharField(source="item.hsn_code", read_only=True)
    unit_of_measure = serializers.CharField(source="item.unit_of_measure", read_only=True)
    barcode = serializers.CharField(source="item.barcode", read_only=True)
    is_global = serializers.BooleanField(source="item.is_global", read_only=True)
    gst_percent = serializers.DecimalField(source="item.gst_percent", max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = UserItem
        fields = [
            "id",
            "item_id",
            "name",
            "category",
            "hsn_code",
            "unit_of_measure",
            "barcode",
            "is_global",
            "gst_percent",
            "selling_price",
            "mrp",
            "margin",
            "stock_quantity",
            "is_active",
        ]


class InventoryItemSerializer(serializers.ModelSerializer):
    item_id = serializers.PrimaryKeyRelatedField(source="item", read_only=True)
    name = serializers.CharField(source="item.name", read_only=True)
    category = serializers.CharField(source="item.category", read_only=True)
    hsn_code = serializers.CharField(source="item.hsn_code", read_only=True)
    unit_of_measure = serializers.CharField(source="item.unit_of_measure", read_only=True)
    barcode = serializers.CharField(source="item.barcode", read_only=True)
    is_global = serializers.BooleanField(source="item.is_global", read_only=True)
    gst_percent = serializers.DecimalField(source="item.gst_percent", max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "item_id",
            "name",
            "category",
            "hsn_code",
            "unit_of_measure",
            "barcode",
            "is_global",
            "gst_percent",
            "buying_price",
            "selling_price",
            "stock_qty",
            "net_worth",
            "is_active",
        ]
        read_only_fields = ["net_worth"]



class BillLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillLine
        fields = [
            "id",
            "item_name",
            "hsn_code",
            "quantity",
            "unit_amount",
            "gst_percent",
            "taxable_value",
            "cgst_rate",
            "cgst_amount",
            "sgst_rate",
            "sgst_amount",
            "total_amount",
        ]


class BillSerializer(serializers.ModelSerializer):
    lines = BillLineSerializer(many=True, read_only=True)

    class Meta:
        model = Bill
        fields = [
            "id",
            "bill_no",
            "customer_name",
            "bill_date",
            "taxable_value",
            "cgst_amount",
            "sgst_amount",
            "total_amount",
            "lines",
        ]


class GenerationRunSerializer(serializers.ModelSerializer):
    shop = ShopSerializer(read_only=True)
    bills = BillSerializer(many=True, read_only=True)

    class Meta:
        model = GenerationRun
        fields = [
            "id",
            "shop",
            "month",
            "target_amount",
            "generated_amount",
            "remaining_amount",
            "bills_per_day",
            "created_at",
            "bills",
        ]


class GenerateBillsSerializer(serializers.Serializer):
    shop_id = serializers.IntegerField(required=False, allow_null=True)
    shop_name = serializers.CharField(max_length=160)
    shop_type = serializers.ChoiceField(choices=Shop.SHOP_TYPES)
    address = serializers.CharField()
    gst_number = serializers.CharField(max_length=32)
    month = serializers.DateField()
    target_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    bills_per_day = serializers.IntegerField(min_value=1, max_value=40)
    items = ItemSerializer(many=True, required=False, default=[])
