from django.contrib import admin

from .models import Bill, BillLine, GenerationRun, InventoryItem, Item, Shop, UserProfile

admin.site.register(Shop)
admin.site.register(Item)
admin.site.register(GenerationRun)
admin.site.register(Bill)
admin.site.register(BillLine)
admin.site.register(InventoryItem)
admin.site.register(UserProfile)
