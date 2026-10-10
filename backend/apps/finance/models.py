from django.db import models
from simple_history.models import HistoricalRecords

from apps.accounts.models import Farm


class OperationalCost(models.Model):
    class Category(models.TextChoices):
        CASUAL_LABOUR = "CASUAL_LABOUR", "Casual Labour"
        WAGES = "WAGES", "Staff / Manager Wages"
        EQUIPMENT = "EQUIPMENT", "Equipment & Amenities"
        UTILITIES = "UTILITIES", "Utilities (water, electricity, fuel)"
        MAINTENANCE = "MAINTENANCE", "Repairs & Maintenance"
        TRANSPORT = "TRANSPORT", "Transport"
        OTHER = "OTHER", "Other"

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="operational_costs")
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.CharField(
        max_length=300, help_text="e.g. Casual labour - weeding, Solar panel purchase"
    )
    # Optional breakdown for costs with a natural unit (e.g. 3 workers x 2
    # days at a day rate). When both are supplied the mutation computes
    # `amount` from them; a flat one-off cost can just set `amount` directly.
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date_incurred = models.DateField()
    payee = models.CharField(max_length=200, blank=True, help_text="Who was paid / supplier name")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-date_incurred"]

    def __str__(self):
        return f"{self.description} – {self.amount} ({self.date_incurred})"
