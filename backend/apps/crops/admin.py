from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import (
    Crop,
    CropDamage,
    CropPlanting,
    CropYield,
    FenceDamage,
    Pesticide,
    PesticideApplication,
    PesticideApplicationAllocation,
    PestIncident,
    Seedling,
    SeedlingPurchase,
    SeedlingPurchaseAllocation,
    SoilInput,
    SoilInputPurchase,
    SoilInputPurchaseAllocation,
    SoilTreatment,
    SoilTreatmentAllocation,
)


class CropYieldInline(admin.TabularInline):
    model = CropYield
    extra = 0


class CropDamageInline(admin.TabularInline):
    model = CropDamage
    extra = 0


class PestIncidentInline(admin.TabularInline):
    model = PestIncident
    extra = 0


@admin.register(Crop)
class CropAdmin(SimpleHistoryAdmin):
    list_display = ["name", "category"]
    list_filter = ["category"]


@admin.register(CropPlanting)
class CropPlantingAdmin(SimpleHistoryAdmin):
    list_display = ["crop", "farm", "acreage", "planting_date", "status"]
    list_filter = ["status", "farm"]
    inlines = [CropYieldInline, CropDamageInline, PestIncidentInline]


@admin.register(Pesticide)
class PesticideAdmin(SimpleHistoryAdmin):
    list_display = ["name", "pesticide_type", "active_ingredient"]


@admin.register(FenceDamage)
class FenceDamageAdmin(SimpleHistoryAdmin):
    list_display = ["farm", "damage_type", "date_reported", "severity", "repair_status"]
    list_filter = ["repair_status", "damage_type"]


@admin.register(Seedling)
class SeedlingAdmin(SimpleHistoryAdmin):
    list_display = ["name", "crop", "maturity_days"]
    list_filter = ["crop"]


class SeedlingPurchaseAllocationInline(admin.TabularInline):
    model = SeedlingPurchaseAllocation
    extra = 0


class SoilTreatmentAllocationInline(admin.TabularInline):
    model = SoilTreatmentAllocation
    extra = 0


class SoilInputPurchaseAllocationInline(admin.TabularInline):
    model = SoilInputPurchaseAllocation
    extra = 0


class PesticideApplicationAllocationInline(admin.TabularInline):
    model = PesticideApplicationAllocation
    extra = 0


@admin.register(SeedlingPurchase)
class SeedlingPurchaseAdmin(SimpleHistoryAdmin):
    list_display = ["seedling", "quantity", "unit", "supplier", "purchase_date"]
    inlines = [SeedlingPurchaseAllocationInline]


@admin.register(SoilInput)
class SoilInputAdmin(SimpleHistoryAdmin):
    list_display = ["name", "input_type"]
    list_filter = ["input_type"]


@admin.register(SoilInputPurchase)
class SoilInputPurchaseAdmin(SimpleHistoryAdmin):
    list_display = ["soil_input", "quantity", "unit", "supplier", "purchase_date"]
    inlines = [SoilInputPurchaseAllocationInline]


@admin.register(SoilTreatment)
class SoilTreatmentAdmin(SimpleHistoryAdmin):
    list_display = ["soil_input", "quantity", "unit", "supplier", "date_applied"]
    inlines = [SoilTreatmentAllocationInline]


@admin.register(PesticideApplication)
class PesticideApplicationAdmin(SimpleHistoryAdmin):
    list_display = ["pesticide", "quantity", "unit", "supplier", "date_applied"]
    inlines = [PesticideApplicationAllocationInline]
