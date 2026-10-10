from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import OperationalCost


@admin.register(OperationalCost)
class OperationalCostAdmin(SimpleHistoryAdmin):
    list_display = ["description", "farm", "category", "amount", "date_incurred", "payee"]
    list_filter = ["category", "farm"]
