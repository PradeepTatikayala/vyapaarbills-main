from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GenerationRunViewSet,
    ItemViewSet,
    ShopViewSet,
    UserItemViewSet,
    InventoryItemViewSet,
    user_categories,
    add_custom_item,
    search_global_items,
    add_from_global,
    generate,
    user_login,
    user_logout,
    register,
    shop_types,
    support_ticket,
    admin_stats,
    admin_users,
    admin_update_user,
    admin_toggle_restriction,
    user_dashboard,
    download_pdf,
    pay_pending,
    create_razorpay_order,
    verify_razorpay_payment,
    user_update_plan,
    pos_generate_bill,
    download_pos_bills_pdf,
)

router = DefaultRouter()
router.register("shops", ShopViewSet)
router.register("items", ItemViewSet)
router.register("user-items", UserItemViewSet, basename="user-items")
router.register("inventory", InventoryItemViewSet, basename="inventory")
router.register("generation-runs", GenerationRunViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("shop-types/", shop_types),
    path("support/ticket/", support_ticket),
    path("auth/register/", register),
    path("auth/login/", user_login),
    path("auth/logout/", user_logout),
    path("generate/", generate),
    path("admin/stats/", admin_stats),
    path("admin/users/", admin_users),
    path("admin/users/<int:pk>/", admin_update_user),
    path("admin/users/<int:pk>/toggle-restriction/", admin_toggle_restriction),
    path("user/dashboard/", user_dashboard, name="user_dashboard"),
    path("user/pay/", pay_pending, name="pay_pending"),
    path("payments/razorpay/order/", create_razorpay_order, name="create_razorpay_order"),
    path("payments/razorpay/verify/", verify_razorpay_payment, name="verify_razorpay_payment"),
    path("user/plan/", user_update_plan, name="user_update_plan"),
    path("user/categories/", user_categories),
    path("user-items/add-custom/", add_custom_item),
    path("user-items/search-global/", search_global_items),
    path("user-items/add-from-global/", add_from_global),
    path("pos/generate-bill/", pos_generate_bill),
    path("pos/download-bills-pdf/", download_pos_bills_pdf),
    path("generation-runs/<int:pk>/download-pdf/", download_pdf),
]
