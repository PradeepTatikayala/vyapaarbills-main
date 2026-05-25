import os
import random
from decimal import Decimal, InvalidOperation
from django.utils import timezone
from django.http import HttpResponse
from django.db import transaction
from django.conf import settings
from django.core.mail import send_mail

from rest_framework import exceptions, permissions, status, viewsets
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

try:
    import razorpay
except ImportError:
    razorpay = None

from .serializers import (
    GenerateBillsSerializer,
    GenerationRunSerializer,
    ItemSerializer,
    LoginSerializer,
    RegisterSerializer,
    ShopSerializer,
    SupportTicketSerializer,
    UserProfileSerializer,
    UserSelectedCategorySerializer,
    UserItemSerializer,
    InventoryItemSerializer,
)
from .models import (
    Bill,
    BillLine,
    GenerationRun,
    InventoryItem,
    Item,
    PaymentTransaction,
    Shop,
    UserItem,
    UserProfile,
    UserSelectedCategory,
)
from .services import generate_bills, generate_pdf, generate_pos_bills_pdf
from .sarvam_helper import analyze_item_with_sarvam, generate_unique_barcode
from django.http import FileResponse


def is_custom_plan_pending(user):
    profile = getattr(user, "profile", None)
    if not profile or profile.plan != UserProfile.CUSTOM:
        return False

    custom_price = profile.custom_plan_price or Decimal("0.00")
    custom_runs = profile.custom_monthly_runs or 0
    return not profile.is_active or custom_price <= Decimal("0.00") or custom_runs <= 0


def is_gst_pending(user):
    if user.is_staff or user.is_superuser:
        return False

    shop = Shop.objects.filter(owner=user).first()
    if not shop:
        return True

    gst_number = (shop.gst_number or "").strip().upper()
    return gst_number in {"", "UNREGISTERED", "PENDING_GST"}


def refresh_subscription_status(profile):
    if not profile:
        return None
    if profile.user.is_staff or profile.user.is_superuser:
        return profile

    if is_custom_plan_pending(profile.user):
        return profile

    if profile.is_payment_overdue and profile.is_active:
        profile.is_active = False
        profile.save(update_fields=["is_active"])

    return profile


def ensure_service_access(user):
    if user.is_superuser:
        return

    profile = refresh_subscription_status(getattr(user, "profile", None))
    if is_custom_plan_pending(user):
        raise exceptions.PermissionDenied(
            "Custom plan is pending admin approval. Please contact support until amount and monthly runs are added."
        )
    if is_gst_pending(user):
        raise exceptions.PermissionDenied("GST number is pending admin approval. Please contact support until admin adds your GSTIN.")
    if profile and not profile.is_active:
        raise exceptions.PermissionDenied("Account restricted because payment was not completed before the due date.")


def get_razorpay_client():
    if razorpay is None:
        raise exceptions.APIException("Razorpay SDK is not installed. Run pip install -r requirements.txt.")
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise exceptions.APIException("Razorpay keys are not configured in backend/.env.")
    if not settings.RAZORPAY_KEY_ID.startswith(("rzp_test_", "rzp_live_")):
        raise exceptions.APIException("Razorpay key id is invalid. It must start with rzp_test_ or rzp_live_.")
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


class CustomPlanReadyMixin:
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.user.is_authenticated:
            ensure_service_access(request.user)



class ShopViewSet(viewsets.ModelViewSet):
    queryset = Shop.objects.all() 
    serializer_class = ShopSerializer

    def get_queryset(self):
        return Shop.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        if self.request.user.is_staff or self.request.user.is_superuser:
            serializer.save()
            return
        serializer.save(gst_number=serializer.instance.gst_number)


class ItemViewSet(CustomPlanReadyMixin, viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

    def get_queryset(self):
        queryset = Item.objects.filter(is_active=True).filter(
            Q(owner=self.request.user) | Q(shop__owner=self.request.user) | Q(shop__isnull=True, owner__isnull=True)
        )
        shop_type = self.request.query_params.get("shop_type")
        shop_id = self.request.query_params.get("shop_id")
        if shop_type:
            queryset = queryset.filter(shop_type=shop_type)
        if shop_id:
            queryset = queryset.filter(shop_id=shop_id)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(category__icontains=search) |
                Q(barcode__icontains=search) |
                Q(hsn_code__icontains=search)
            )
        return queryset.order_by("name")

    def perform_create(self, serializer):
        shop = Shop.objects.get(id=self.request.data["shop"], owner=self.request.user)
        serializer.save(shop=shop, shop_type=shop.shop_type)


class UserItemViewSet(CustomPlanReadyMixin, viewsets.ModelViewSet):
    serializer_class = UserItemSerializer

    def get_queryset(self):
        queryset = UserItem.objects.filter(user=self.request.user)

        # Filter by active status
        is_active_param = self.request.query_params.get("is_active")
        if is_active_param is not None:
            is_active = is_active_param.lower() in ("true", "1")
            queryset = queryset.filter(is_active=is_active)
        else:
            queryset = queryset.filter(is_active=True)

        # Filter by category
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(item__category=category)

        # Search term
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(item__name__icontains=search) | Q(item__barcode__icontains=search) | Q(item__hsn_code__icontains=search)
            )

        return queryset.select_related("item").order_by("item__name")

    def perform_update(self, serializer):
        mrp = Decimal(self.request.data.get("mrp", serializer.instance.mrp))
        selling_price = Decimal(self.request.data.get("selling_price", serializer.instance.selling_price))

        # Margin recalculation
        margin = Decimal("0.00")
        if mrp > 0:
            margin = ((mrp - selling_price) / mrp) * Decimal("100.00")

        serializer.save(margin=margin)


class InventoryItemViewSet(CustomPlanReadyMixin, viewsets.ModelViewSet):
    serializer_class = InventoryItemSerializer

    def get_queryset(self):
        return InventoryItem.objects.filter(user=self.request.user, is_active=True).select_related("item").order_by("item__name")

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    def create(self, request, *args, **kwargs):
        item_id = request.data.get("item_id")
        item_name = request.data.get("item_name")
        buying_price = Decimal(str(request.data.get("buying_price", "0.00")))
        selling_price = Decimal(str(request.data.get("selling_price", "0.00")))
        stock_qty = Decimal(str(request.data.get("stock_qty", "0.00")))

        with transaction.atomic():
            if item_id:
                try:
                    item = Item.objects.get(id=item_id)
                except Item.DoesNotExist:
                    return Response({"detail": "Global item not found"}, status=status.HTTP_404_NOT_FOUND)
            elif item_name:
                item = Item.objects.filter(name__iexact=item_name.strip(), is_global=True, is_active=True).first()
                if not item:
                    analysis = analyze_item_with_sarvam(item_name, "pcs")
                    barcode = generate_unique_barcode()
                    item = Item.objects.create(
                        name=analysis["normalized_name"],
                        category=analysis["category"],
                        hsn_code=analysis["hsn_code"],
                        unit_of_measure="pcs",
                        barcode=barcode,
                        mrp=selling_price,
                        gst_percent=analysis["gst_percent"],
                        is_global=True,
                        is_active=True
                    )
            else:
                return Response({"detail": "Either item_id or item_name is required"}, status=status.HTTP_400_BAD_REQUEST)

            inventory_item, created = InventoryItem.objects.update_or_create(
                user=request.user,
                item=item,
                defaults={
                    "buying_price": buying_price,
                    "selling_price": selling_price,
                    "stock_qty": stock_qty,
                    "is_active": True
                }
            )

        return Response(InventoryItemSerializer(inventory_item).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="dashboard-stats")
    def dashboard_stats(self, request):
        inventory_items = InventoryItem.objects.filter(user=self.request.user, is_active=True)
        in_stock_value = sum(i.buying_price * i.stock_qty for i in inventory_items)

        pos_bills = Bill.objects.filter(user=self.request.user, is_pos=True)
        converted_to_cash = sum(b.total_amount for b in pos_bills)

        cogs = Decimal("0.00")
        for bill in pos_bills:
            for line in bill.lines.all():
                inv_item = InventoryItem.objects.filter(user=self.request.user, item__name=line.item_name).first()
                if inv_item:
                    cogs += inv_item.buying_price * line.quantity
                else:
                    cogs += line.unit_amount * Decimal("0.70") * line.quantity

        total_invested = in_stock_value + cogs

        return Response({
            "in_stock_value": in_stock_value,
            "converted_to_cash": converted_to_cash,
            "total_invested": total_invested
        })


@api_view(["GET", "POST"])
def user_categories(request):
    ensure_service_access(request.user)

    if request.method == "GET":
        seen = {}
        for category in Item.objects.filter(is_global=True).values_list("category", flat=True):
            if not category:
                continue
            cleaned = " ".join(str(category).strip().split())
            seen.setdefault(cleaned.lower(), cleaned)
        available = sorted(seen.values(), key=str.lower)

        selected_seen = {}
        for category in UserSelectedCategory.objects.filter(user=request.user, is_active=True).values_list("category", flat=True):
            cleaned = " ".join(str(category).strip().split())
            selected_seen.setdefault(cleaned.lower(), cleaned)
        selected = sorted(selected_seen.values(), key=str.lower)
        return Response({"available": available, "selected": selected})

    elif request.method == "POST":
        categories = request.data.get("categories", [])
        if not isinstance(categories, list):
            return Response({"detail": "categories must be a list of strings"}, status=status.HTTP_400_BAD_REQUEST)

        canonical_categories = {}
        for category in Item.objects.filter(is_global=True).values_list("category", flat=True):
            cleaned = " ".join(str(category).strip().split())
            if cleaned:
                canonical_categories.setdefault(cleaned.lower(), cleaned)

        cleaned_categories = []
        seen = set()
        for cat in categories:
            cleaned = " ".join(str(cat).strip().split())
            key = cleaned.lower()
            if cleaned and key not in seen:
                cleaned_categories.append(canonical_categories.get(key, cleaned))
                seen.add(key)

        with transaction.atomic():
            # Deactivate categories not in list
            UserSelectedCategory.objects.filter(user=request.user).exclude(category__in=cleaned_categories).update(is_active=False)

            # Activate/Create categories in list
            for cat in cleaned_categories:
                UserSelectedCategory.objects.update_or_create(
                    user=request.user,
                    category=cat,
                    defaults={"is_active": True}
                )

            # Map global items of selected categories to UserItem
            items_to_map = Item.objects.filter(category__in=cleaned_categories, is_global=True, is_active=True)
            for item in items_to_map:
                UserItem.objects.get_or_create(
                    user=request.user,
                    item=item,
                    defaults={
                        "selling_price": item.mrp or Decimal("100.00"),
                        "mrp": item.mrp or Decimal("100.00"),
                        "margin": Decimal("0.00"),
                        "stock_quantity": Decimal("0.00"),
                        "is_active": True
                    }
                )

            # Soft-deactivate items whose category is no longer selected
            UserItem.objects.filter(user=request.user, item__is_global=True).exclude(item__category__in=cleaned_categories).update(is_active=False)

            # Re-activate items whose category is now selected
            UserItem.objects.filter(user=request.user, item__category__in=cleaned_categories, item__is_global=True).update(is_active=True)

        return Response({"status": "success", "selected": cleaned_categories})


@api_view(["POST"])
def add_custom_item(request):
    ensure_service_access(request.user)

    name = request.data.get("item_name")
    uom = request.data.get("unit_of_measure", "pcs")
    selling_price = Decimal(str(request.data.get("selling_price", "100")))
    mrp = Decimal(str(request.data.get("mrp", "100")))
    stock = Decimal(str(request.data.get("stock_quantity", "0")))

    if not name:
        return Response({"detail": "item_name is required"}, status=status.HTTP_400_BAD_REQUEST)

    analysis = analyze_item_with_sarvam(name, uom)
    barcode = generate_unique_barcode()

    # Calculate margin
    margin = Decimal("0.00")
    if mrp > 0:
        margin = ((mrp - selling_price) / mrp) * Decimal("100.00")

    with transaction.atomic():
        shop = Shop.objects.filter(owner=request.user).first()
        item = Item.objects.create(
            owner=request.user,
            shop=shop,
            shop_type=shop.shop_type if shop else Shop.GENERAL,
            name=analysis["normalized_name"],
            category=analysis["category"],
            hsn_code=analysis["hsn_code"],
            unit_of_measure=uom,
            barcode=barcode,
            mrp=mrp,
            gst_percent=analysis["gst_percent"],
            is_global=False,
            created_by=request.user,
            is_active=True
        )

        user_item = UserItem.objects.create(
            user=request.user,
            item=item,
            selling_price=selling_price,
            mrp=mrp,
            margin=margin,
            stock_quantity=stock,
            is_active=True
        )

    return Response(UserItemSerializer(user_item).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def search_global_items(request):
    ensure_service_access(request.user)

    query = request.query_params.get("q", "")
    if not query:
        return Response([])

    already_mapped = UserItem.objects.filter(user=request.user).values_list("item_id", flat=True)

    items = Item.objects.filter(is_global=True, is_active=True).exclude(id__in=already_mapped).filter(
        Q(name__icontains=query) | Q(category__icontains=query) | Q(barcode__icontains=query) | Q(hsn_code__icontains=query)
    )[:20]

    return Response(ItemSerializer(items, many=True).data)


@api_view(["POST"])
def add_from_global(request):
    ensure_service_access(request.user)

    item_id = request.data.get("item_id")
    selling_price = Decimal(str(request.data.get("selling_price", "100")))
    mrp = Decimal(str(request.data.get("mrp", "100")))
    stock = Decimal(str(request.data.get("stock_quantity", "0")))

    if not item_id:
        return Response({"detail": "item_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    item = Item.objects.filter(id=item_id, is_global=True).first()
    if not item:
        return Response({"detail": "Global item not found"}, status=status.HTTP_404_NOT_FOUND)

    margin = Decimal("0.00")
    if mrp > 0:
        margin = ((mrp - selling_price) / mrp) * Decimal("100.00")

    user_item, created = UserItem.objects.update_or_create(
        user=request.user,
        item=item,
        defaults={
            "selling_price": selling_price,
            "mrp": mrp,
            "margin": margin,
            "stock_quantity": stock,
            "is_active": True
        }
    )

    return Response(UserItemSerializer(user_item).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)





class GenerationRunViewSet(CustomPlanReadyMixin, viewsets.ReadOnlyModelViewSet):
    queryset = GenerationRun.objects.all()
    serializer_class = GenerationRunSerializer

    def get_queryset(self):
        return (
            GenerationRun.objects
            .filter(shop__owner=self.request.user)
            .select_related("shop")
            .prefetch_related("bills__lines")
            .order_by("-created_at")
        )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def shop_types(request):
    return Response([{"value": value, "label": label} for value, label in Shop.SHOP_TYPES])


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def support_ticket(request):
    serializer = SupportTicketSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    subject = f"VyapaarBills Support Ticket - {data['shop_name']}"
    message = (
        "New support ticket submitted from vyapaarbills.com\n\n"
        f"Customer Name: {data['customer_name']}\n"
        f"Shop Name: {data['shop_name']}\n"
        f"Shop Type: {data['shop_type']}\n\n"
        "Description:\n"
        f"{data['description']}\n"
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [settings.SUPPORT_EMAIL],
        fail_silently=False,
    )

    return Response({"detail": "Support ticket submitted successfully."}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def generate(request):
    ensure_service_access(request.user)

    serializer = GenerateBillsSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    run = generate_bills(serializer.validated_data, request.user)
    return Response(GenerationRunSerializer(run).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.save(), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def user_login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.save())


@api_view(["POST"])
def user_logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)




@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def admin_stats(request):
    profiles = UserProfile.objects.all()
    for profile in profiles:
        refresh_subscription_status(profile)
    total_amount_collected = sum(p.amount_paid for p in profiles)
    total_pending_amount = sum(p.pending_amount for p in profiles)
    now = timezone.now()
    monthly_billing_runs = GenerationRun.objects.filter(
        created_at__year=now.year, created_at__month=now.month
    ).count()

    return Response({
        "total_users": profiles.count(),
        "active_users": profiles.filter(is_active=True).count(),
        "inactive_users": profiles.filter(is_active=False).count(),
        "total_amount_collected": total_amount_collected,
        "total_pending_amount": total_pending_amount,
        "monthly_billing_runs": monthly_billing_runs,
    })


@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def admin_users(request):
    profiles = UserProfile.objects.all().select_related("user")
    for profile in profiles:
        refresh_subscription_status(profile)
    serializer = UserProfileSerializer(profiles, many=True)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([permissions.IsAdminUser])
def admin_update_user(request, pk):
    profile = UserProfile.objects.get(pk=pk)
    serializer = UserProfileSerializer(profile, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    if "gst_number" in request.data and not (profile.user.is_staff or profile.user.is_superuser):
        gst_number = str(request.data.get("gst_number") or "").strip()
        shop = Shop.objects.filter(owner=profile.user).first()
        if shop:
            shop.gst_number = gst_number or "PENDING_GST"
            shop.save(update_fields=["gst_number"])
        else:
            Shop.objects.create(
                owner=profile.user,
                name=profile.user.email.split("@")[0] or "Customer Shop",
                shop_type=Shop.GENERAL,
                dealer_type=Shop.REGULAR,
                address="Pending shop details",
                gst_number=gst_number or "PENDING_GST",
            )

    return Response(UserProfileSerializer(profile).data)


@api_view(["POST"])
@permission_classes([permissions.IsAdminUser])
def pay_pending(request):
    profile_id = request.data.get("profile_id")
    if profile_id:
        profile = UserProfile.objects.filter(id=profile_id).first()
    else:
        profile = getattr(request.user, "profile", None)
    if not profile:
        return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)
    
    pending = profile.pending_amount
    if pending > Decimal("0.00"):
        profile.amount_paid += pending
        
    # Automatically activate account when bill is fully paid/cleared
    profile.is_active = True
    profile.save()
    
    return Response(UserProfileSerializer(profile).data)


@api_view(["POST"])
def create_razorpay_order(request):
    profile = getattr(request.user, "profile", None)
    if not profile:
        return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

    refresh_subscription_status(profile)
    pending = profile.pending_amount
    if pending <= Decimal("0.00"):
        return Response({"detail": "No pending amount to pay."}, status=status.HTTP_400_BAD_REQUEST)

    amount_paise = int((pending * Decimal("100")).quantize(Decimal("1")))
    client = get_razorpay_client()
    receipt = f"VB-{profile.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
    order = client.order.create(
        {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "user_id": str(request.user.id),
                "profile_id": str(profile.id),
                "plan": profile.plan,
            },
        }
    )

    PaymentTransaction.objects.create(
        user=request.user,
        profile=profile,
        amount=pending,
        currency="INR",
        razorpay_order_id=order["id"],
    )

    return Response(
        {
            "key": settings.RAZORPAY_KEY_ID,
            "key_mode": "live" if settings.RAZORPAY_KEY_ID.startswith("rzp_live_") else "test",
            "order_id": order["id"],
            "amount": amount_paise,
            "amount_rupees": str(pending),
            "currency": "INR",
            "name": "VyapaarBills",
            "description": f"{profile.plan.title()} plan payment",
            "prefill": {
                "email": request.user.email,
                "contact": profile.phone_number,
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def verify_razorpay_payment(request):
    order_id = request.data.get("razorpay_order_id")
    payment_id = request.data.get("razorpay_payment_id")
    signature = request.data.get("razorpay_signature")

    if not order_id or not payment_id or not signature:
        return Response({"detail": "Missing Razorpay payment verification fields."}, status=status.HTTP_400_BAD_REQUEST)

    payment = PaymentTransaction.objects.select_related("profile").filter(
        user=request.user,
        razorpay_order_id=order_id,
    ).first()
    if not payment:
        return Response({"detail": "Payment order not found."}, status=status.HTTP_404_NOT_FOUND)

    if payment.status == PaymentTransaction.PAID:
        return Response(
            {
                "status": "paid",
                "profile": UserProfileSerializer(payment.profile).data,
            }
        )

    client = get_razorpay_client()
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
        )
    except Exception:
        payment.status = PaymentTransaction.FAILED
        payment.razorpay_payment_id = payment_id
        payment.razorpay_signature = signature
        payment.save(update_fields=["status", "razorpay_payment_id", "razorpay_signature"])
        return Response({"detail": "Payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        payment = PaymentTransaction.objects.select_for_update().select_related("profile").get(id=payment.id)
        profile = UserProfile.objects.select_for_update().get(id=payment.profile_id)
        if payment.status != PaymentTransaction.PAID:
            max_paid = profile.total_amount_due
            profile.amount_paid = min(max_paid, profile.amount_paid + payment.amount)
            if profile.pending_amount <= Decimal("0.00"):
                profile.is_active = True
            profile.save(update_fields=["amount_paid", "is_active"])

            payment.status = PaymentTransaction.PAID
            payment.razorpay_payment_id = payment_id
            payment.razorpay_signature = signature
            payment.paid_at = timezone.now()
            payment.save(update_fields=["status", "razorpay_payment_id", "razorpay_signature", "paid_at"])

    return Response(
        {
            "status": "paid",
            "profile": UserProfileSerializer(profile).data,
        }
    )


@api_view(["GET"])
def user_dashboard(request):
    profile = getattr(request.user, "profile", None)
    if not profile:
        return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)
    refresh_subscription_status(profile)

    shop = Shop.objects.filter(owner=request.user).first()
    runs_count = GenerationRun.objects.filter(
        shop__owner=request.user,
        created_at__year=timezone.now().year,
        created_at__month=timezone.now().month
    ).count()

    return Response({
        "profile": UserProfileSerializer(profile).data,
        "is_admin": request.user.is_staff or request.user.is_superuser,
        "is_gst_pending": is_gst_pending(request.user),
        "shop": ShopSerializer(shop).data if shop else None,
        "monthly_runs": runs_count,
        "items_count": Item.objects.filter(shop__owner=request.user).count(),
        "admin_upi_id": os.getenv("UPI_ID", "default_admin@upi")
    })


@api_view(["POST"])
def user_update_plan(request):
    profile = getattr(request.user, "profile", None)
    if not profile:
        return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)
    
    plan = request.data.get("plan")
    if plan not in dict(UserProfile.PLAN_CHOICES):
        return Response({"detail": "Invalid plan."}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    used_runs = GenerationRun.objects.filter(
        shop__owner=request.user,
        created_at__year=now.year,
        created_at__month=now.month
    ).count()
    requested_allowed_runs = {
        UserProfile.BASIC: 3,
        UserProfile.MEDIUM: 5,
        UserProfile.CUSTOM: profile.custom_monthly_runs or 0,
    }.get(plan, 0)

    if used_runs > requested_allowed_runs:
        return Response(
            {
                "detail": (
                    f"Cannot downgrade to {plan}. You already used {used_runs} billing runs this month, "
                    f"but this plan allows only {requested_allowed_runs}."
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )
        
    profile.plan = plan
    if plan == "custom" and not profile.custom_plan_price:
        profile.custom_plan_price = None
        profile.custom_monthly_runs = None
        profile.is_active = False

    profile.save()
    return Response(UserProfileSerializer(profile).data)


@api_view(["GET"])
def download_pdf(request, pk):
    ensure_service_access(request.user)

    run = GenerationRun.objects.filter(id=pk, shop__owner=request.user).first()
    if not run:
        return Response({"detail": "Run not found."}, status=status.HTTP_404_NOT_FOUND)

    buffer = generate_pdf(run)
    return FileResponse(buffer, as_attachment=True, filename=f"bills_{run.month.strftime('%Y_%m')}.pdf")


@api_view(["GET"])
def download_pos_bills_pdf(request):
    ensure_service_access(request.user)

    buffer = generate_pos_bills_pdf(request.user)
    return FileResponse(buffer, as_attachment=True, filename="inventory_pos_bills.pdf")


@api_view(["POST"])
def pos_generate_bill(request):
    ensure_service_access(request.user)

    customer_name = request.data.get("customer_name", "Walk-in Customer")
    cart = request.data.get("cart", [])

    if not cart:
        return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

    shop = Shop.objects.filter(owner=request.user).first()
    bill_no = f"POS-{timezone.now().strftime('%Y%m%d%H%M%S')}-{random.randint(100, 999)}"

    with transaction.atomic():
        # Create Bill record
        bill = Bill.objects.create(
            user=request.user,
            shop=shop,
            is_pos=True,
            bill_no=bill_no,
            customer_name=customer_name,
            bill_date=timezone.now().date(),
            taxable_value=Decimal("0.00"),
            cgst_amount=Decimal("0.00"),
            sgst_amount=Decimal("0.00"),
            total_amount=Decimal("0.00")
        )

        taxable_sum = Decimal("0.00")
        cgst_sum = Decimal("0.00")
        sgst_sum = Decimal("0.00")
        total_sum = Decimal("0.00")

        for cart_item in cart:
            inventory_item_id = cart_item.get("inventory_item_id")
            quantity = Decimal(str(cart_item.get("quantity", "1")))
            selling_price = Decimal(str(cart_item.get("selling_price", "0")))

            try:
                inv_item = InventoryItem.objects.get(id=inventory_item_id, user=request.user)
            except InventoryItem.DoesNotExist:
                return Response({"detail": f"Inventory item {inventory_item_id} not found"}, status=status.HTTP_404_NOT_FOUND)

            # Deduct stock
            if inv_item.stock_qty >= quantity:
                inv_item.stock_qty -= quantity
            else:
                inv_item.stock_qty = Decimal("0.00")
            inv_item.save()

            gst_percent = inv_item.item.gst_percent or Decimal("18.00")
            cgst_rate = gst_percent / Decimal("2.00")
            sgst_rate = gst_percent / Decimal("2.00")

            line_total = selling_price * quantity
            line_taxable = line_total / (Decimal("1.00") + (gst_percent / Decimal("100.00")))
            line_cgst = (line_total - line_taxable) / Decimal("2.00")
            line_sgst = (line_total - line_taxable) / Decimal("2.00")

            BillLine.objects.create(
                bill=bill,
                item_name=inv_item.item.name,
                hsn_code=inv_item.item.hsn_code or "",
                quantity=int(quantity),
                unit_amount=selling_price,
                gst_percent=gst_percent,
                taxable_value=line_taxable.quantize(Decimal("0.01")),
                cgst_rate=cgst_rate,
                cgst_amount=line_cgst.quantize(Decimal("0.01")),
                sgst_rate=sgst_rate,
                sgst_amount=line_sgst.quantize(Decimal("0.01")),
                total_amount=line_total.quantize(Decimal("0.01"))
            )

            taxable_sum += line_taxable
            cgst_sum += line_cgst
            sgst_sum += line_sgst
            total_sum += line_total

        bill.taxable_value = taxable_sum.quantize(Decimal("0.01"))
        bill.cgst_amount = cgst_sum.quantize(Decimal("0.01"))
        bill.sgst_amount = sgst_sum.quantize(Decimal("0.01"))
        bill.total_amount = total_sum.quantize(Decimal("0.01"))
        bill.save()

    from .serializers import BillSerializer
    return Response(BillSerializer(bill).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([permissions.IsAdminUser])
def admin_toggle_restriction(request, pk):
    try:
        profile = UserProfile.objects.get(pk=pk)
    except UserProfile.DoesNotExist:
        return Response({"detail": "User profile not found"}, status=status.HTTP_404_NOT_FOUND)
        
    profile.is_active = not profile.is_active
    profile.save()
    return Response(UserProfileSerializer(profile).data)
