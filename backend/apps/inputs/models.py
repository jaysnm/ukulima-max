from django.contrib.auth.models import User
from django.db import models
from simple_history.models import HistoricalRecords

from apps.accounts.models import FarmPortion, WithContentMeasure, WithSupplier
from apps.livestock.models import AnimalCategory
from apps.utils import CatalogItem, WithPhoto


class VeterinaryDrug(CatalogItem, WithPhoto):
    class DrugType(models.TextChoices):
        VACCINE = "VACCINE", "Vaccine"
        ANTIBIOTIC = "ANTIBIOTIC", "Antibiotic"
        ANTIPARASITIC = "ANTIPARASITIC", "Antiparasitic / Dewormer"
        SUPPLEMENT = "SUPPLEMENT", "Vitamin / Supplement"
        HORMONE = "HORMONE", "Hormone"
        DISINFECTANT = "DISINFECTANT", "Disinfectant"
        OTHER = "OTHER", "Other"

    drug_type = models.CharField(max_length=20, choices=DrugType.choices)
    active_ingredient = models.CharField(max_length=300, blank=True)
    target_species = models.CharField(
        max_length=200, blank=True, help_text="e.g. Cattle, Poultry, All"
    )
    dosage_instructions = models.TextField(blank=True)
    withdrawal_period_days = models.PositiveIntegerField(
        null=True, blank=True, help_text="Withdrawal period before slaughter/milking"
    )
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.name} ({self.drug_type})"


class AnimalTreatment(WithSupplier, WithContentMeasure, models.Model):
    """Bought once but often shared across farms — the treatment carries no
    single farm; each farm's portion lives on AnimalTreatmentAllocation
    instead. Animal count treated stays here as a whole-purchase aggregate
    rather than being split per farm.
    """

    class Unit(models.TextChoices):
        ML = "ML", "Millilitres"
        LITRES = "LITRES", "Litres"
        MG = "MG", "Milligrams"
        GRAMS = "GRAMS", "Grams"
        TABLETS = "TABLETS", "Tablets"
        VIALS = "VIALS", "Vials"
        SACHETS = "SACHETS", "Sachets"

    animal_type = models.CharField(max_length=20, choices=AnimalCategory.choices)
    animal_count_treated = models.PositiveIntegerField()
    drug = models.ForeignKey(VeterinaryDrug, on_delete=models.CASCADE, related_name="treatments")
    treatment_date = models.DateField()
    dosage_per_animal = models.CharField(max_length=100, blank=True)
    quantity_used = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.ML)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    administered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="treatments_given"
    )
    condition_treated = models.CharField(max_length=200, blank=True)
    outcome = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-treatment_date"]

    def __str__(self):
        return f"{self.drug.name} – {self.animal_type} x{self.animal_count_treated} ({self.treatment_date})"

    @property
    def total_cost(self):
        if self.unit_cost is None:
            return None
        return self.quantity_used * self.unit_cost


class AnimalTreatmentAllocation(FarmPortion):
    purchase = models.ForeignKey(
        AnimalTreatment, on_delete=models.CASCADE, related_name="allocations"
    )
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.purchase.drug.name} – {self.farm.name} ({self.quantity})"

    @property
    def total_cost(self):
        if self.purchase.unit_cost is None:
            return None
        return self.quantity * self.purchase.unit_cost


class AnimalFeed(CatalogItem, WithPhoto):
    class FeedType(models.TextChoices):
        CONCENTRATE = "CONCENTRATE", "Concentrate / Pellets"
        HAY = "HAY", "Hay"
        SILAGE = "SILAGE", "Silage"
        PASTURE = "PASTURE", "Pasture / Fodder"
        GRAIN = "GRAIN", "Grain"
        MINERAL_BLOCK = "MINERAL_BLOCK", "Mineral Block / Lick"
        SUPPLEMENT = "SUPPLEMENT", "Supplement / Premix"
        CRUMBS = "CRUMBS", "Crumbs"
        KITCHEN_WASTE = "KITCHEN_WASTE", "Kitchen Waste / Mash"
        OTHER = "OTHER", "Other"

    feed_type = models.CharField(max_length=20, choices=FeedType.choices)
    target_species = models.CharField(max_length=200, blank=True)
    nutritional_info = models.TextField(blank=True)
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.name} ({self.feed_type})"


class FeedRecord(WithSupplier, WithContentMeasure, models.Model):
    """Bought once but often shared across farms — the record carries no
    single farm; each farm's portion lives on FeedRecordAllocation instead.
    Animal count fed stays here as a whole-purchase aggregate rather than
    being split per farm.
    """

    class Unit(models.TextChoices):
        KG = "KG", "Kilograms"
        GRAMS = "GRAMS", "Grams"
        LITRES = "LITRES", "Litres"
        BAGS = "BAGS", "Bags"
        BALES = "BALES", "Bales"
        TONNES = "TONNES", "Tonnes"

    animal_type = models.CharField(max_length=20, choices=AnimalCategory.choices)
    feed = models.ForeignKey(AnimalFeed, on_delete=models.CASCADE, related_name="feed_records")
    feed_date = models.DateField()
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.KG)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    animal_count_fed = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-feed_date"]

    def __str__(self):
        return f"{self.feed.name} – {self.animal_type} {self.feed_date}"

    @property
    def total_cost(self):
        if self.unit_cost is None:
            return None
        return self.quantity * self.unit_cost


class FeedRecordAllocation(FarmPortion):
    purchase = models.ForeignKey(FeedRecord, on_delete=models.CASCADE, related_name="allocations")
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.purchase.feed.name} – {self.farm.name} ({self.quantity})"

    @property
    def total_cost(self):
        if self.purchase.unit_cost is None:
            return None
        return self.quantity * self.purchase.unit_cost
