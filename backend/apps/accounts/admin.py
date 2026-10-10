from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import Farm, FarmMember, Supplier


class FarmMemberInline(admin.TabularInline):
    model = FarmMember
    extra = 1


@admin.register(Farm)
class FarmAdmin(SimpleHistoryAdmin):
    list_display = ["name", "location", "size_acres", "owner", "created_at"]
    search_fields = ["name", "location", "owner__username"]
    inlines = [FarmMemberInline]


@admin.register(Supplier)
class SupplierAdmin(SimpleHistoryAdmin):
    list_display = ["name", "phone", "location"]
    search_fields = ["name", "phone", "location"]
