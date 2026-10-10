from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import EggProduction, LivestockCensus, LivestockEvent


@admin.register(LivestockCensus)
class LivestockCensusAdmin(SimpleHistoryAdmin):
    list_display = ["farm", "animal_type", "census_date", "total_count"]
    list_filter = ["animal_type", "farm"]


@admin.register(LivestockEvent)
class LivestockEventAdmin(SimpleHistoryAdmin):
    list_display = ["farm", "animal_type", "event_type", "event_date", "count"]
    list_filter = ["animal_type", "event_type"]


@admin.register(EggProduction)
class EggProductionAdmin(SimpleHistoryAdmin):
    list_display = [
        "farm",
        "bird_type",
        "production_date",
        "total_eggs",
        "damaged_eggs",
        "sold_eggs",
    ]
    list_filter = ["bird_type", "farm"]
