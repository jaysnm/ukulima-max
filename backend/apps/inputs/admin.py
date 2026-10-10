from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import (
    AnimalFeed,
    AnimalTreatment,
    AnimalTreatmentAllocation,
    FeedRecord,
    FeedRecordAllocation,
    VeterinaryDrug,
)


@admin.register(VeterinaryDrug)
class VeterinaryDrugAdmin(SimpleHistoryAdmin):
    list_display = ["name", "drug_type", "target_species"]
    list_filter = ["drug_type"]


class AnimalTreatmentAllocationInline(admin.TabularInline):
    model = AnimalTreatmentAllocation
    extra = 0


class FeedRecordAllocationInline(admin.TabularInline):
    model = FeedRecordAllocation
    extra = 0


@admin.register(AnimalTreatment)
class AnimalTreatmentAdmin(SimpleHistoryAdmin):
    list_display = [
        "animal_type",
        "drug",
        "treatment_date",
        "animal_count_treated",
        "supplier",
    ]
    list_filter = ["animal_type", "drug__drug_type"]
    inlines = [AnimalTreatmentAllocationInline]


@admin.register(AnimalFeed)
class AnimalFeedAdmin(SimpleHistoryAdmin):
    list_display = ["name", "feed_type", "target_species"]


@admin.register(FeedRecord)
class FeedRecordAdmin(SimpleHistoryAdmin):
    list_display = ["animal_type", "feed", "feed_date", "quantity", "unit", "supplier"]
    list_filter = ["animal_type"]
    inlines = [FeedRecordAllocationInline]
