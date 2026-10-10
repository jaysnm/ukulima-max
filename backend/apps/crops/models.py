from django.contrib.auth.models import User
from django.db import models
from simple_history.models import HistoricalRecords

from apps.accounts.models import Farm, FarmPortion, WithContentMeasure, WithSupplier
from apps.utils import CatalogItem, WithPhoto


class Crop(CatalogItem):
    """Global crop-type catalog shared by every farm — fixing a naming
    error here corrects it everywhere the crop is referenced, instead of
    each farm duplicating its own separate 'Maize' entry.
    """

    class Category(models.TextChoices):
        GRAIN = "GRAIN", "Grain / Cereal"
        VEGETABLE = "VEGETABLE", "Vegetable"
        FRUIT = "FRUIT", "Fruit"
        LEGUME = "LEGUME", "Legume"
        ROOT = "ROOT", "Root / Tuber"
        CASH_CROP = "CASH_CROP", "Cash Crop"
        FORAGE = "FORAGE", "Forage / Fodder"
        OTHER = "OTHER", "Other"

    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    def __str__(self):
        return self.name


class CropPlanting(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active / Growing"
        HARVESTED = "HARVESTED", "Harvested"
        FAILED = "FAILED", "Failed"

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="plantings")
    crop = models.ForeignKey(Crop, on_delete=models.CASCADE, related_name="plantings")
    seedling = models.ForeignKey(
        "Seedling",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plantings",
        help_text="Purchased seedling batch planted here",
    )
    seedling_quantity_kg = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Amount of seedling used, in kilograms (fractions allowed)",
    )
    acreage = models.DecimalField(max_digits=10, decimal_places=2)
    planting_date = models.DateField()
    expected_harvest_date = models.DateField(null=True, blank=True)
    season = models.CharField(max_length=50, blank=True, help_text="e.g. Long Rains 2025")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-planting_date"]

    def __str__(self):
        return f"{self.crop.name} – {self.acreage} ac ({self.planting_date})"

    @property
    def total_cost(self):
        # Each purchase may be shared across farms/plantings, so only this
        # planting's allocated *portion* counts toward its cost, not the
        # whole shared purchase.
        parts = [
            *(a.total_cost for a in self.pesticide_application_allocations.all()),
            *(t.total_cost for t in self.soil_treatment_allocations.all()),
            *(p.total_cost for p in self.seedling_purchase_allocations.all()),
        ]
        known = [p for p in parts if p is not None]
        return sum(known) if known else None

    @property
    def total_revenue(self):
        known = [y.total_revenue for y in self.yields.all() if y.total_revenue is not None]
        return sum(known) if known else None

    @property
    def profit(self):
        cost = self.total_cost
        revenue = self.total_revenue
        if cost is None and revenue is None:
            return None
        return (revenue or 0) - (cost or 0)


class CropYield(models.Model):
    class Unit(models.TextChoices):
        KG = "KG", "Kilograms"
        BAGS_90KG = "BAGS_90KG", "90kg Bags"
        BAGS_50KG = "BAGS_50KG", "50kg Bags"
        TONNES = "TONNES", "Tonnes"
        CRATES = "CRATES", "Crates"
        BUNCHES = "BUNCHES", "Bunches"
        UNITS = "UNITS", "Units"

    planting = models.ForeignKey(CropPlanting, on_delete=models.CASCADE, related_name="yields")
    harvest_date = models.DateField()
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.KG)
    quality_grade = models.CharField(max_length=50, blank=True)
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, help_text="Price per unit sold"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-harvest_date"]

    def __str__(self):
        return f"{self.planting.crop.name} yield: {self.quantity} {self.unit}"

    @property
    def total_revenue(self):
        if self.unit_price is None:
            return None
        return self.quantity * self.unit_price


class CropDamage(WithPhoto, models.Model):
    class DamageType(models.TextChoices):
        PEST = "PEST", "Pest Attack"
        DISEASE = "DISEASE", "Disease"
        WEATHER = "WEATHER", "Weather (hail/wind)"
        FLOOD = "FLOOD", "Flood"
        DROUGHT = "DROUGHT", "Drought"
        FIRE = "FIRE", "Fire"
        THEFT = "THEFT", "Theft"
        FENCE = "FENCE", "Fence Breach (animal entry)"
        OTHER = "OTHER", "Other"

    class Severity(models.TextChoices):
        LOW = "LOW", "Low (<25%)"
        MEDIUM = "MEDIUM", "Medium (25-50%)"
        HIGH = "HIGH", "High (50-75%)"
        TOTAL_LOSS = "TOTAL_LOSS", "Total Loss (>75%)"

    planting = models.ForeignKey(CropPlanting, on_delete=models.CASCADE, related_name="damages")
    damage_type = models.CharField(max_length=20, choices=DamageType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices)
    date_reported = models.DateField()
    area_affected_acres = models.DecimalField(max_digits=8, decimal_places=2)
    estimated_loss_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-date_reported"]

    def __str__(self):
        return f"{self.damage_type} on {self.planting} – {self.severity}"


class PestIncident(WithPhoto, models.Model):
    class Severity(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    planting = models.ForeignKey(
        CropPlanting, on_delete=models.CASCADE, related_name="pest_incidents"
    )
    pest_name = models.CharField(max_length=150)
    date_observed = models.DateField()
    severity = models.CharField(max_length=20, choices=Severity.choices)
    area_affected_acres = models.DecimalField(max_digits=8, decimal_places=2)
    action_taken = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-date_observed"]

    def __str__(self):
        return f"{self.pest_name} ({self.severity}) – {self.date_observed}"


class Pesticide(CatalogItem, WithPhoto):
    class PesticideType(models.TextChoices):
        INSECTICIDE = "INSECTICIDE", "Insecticide"
        HERBICIDE = "HERBICIDE", "Herbicide"
        FUNGICIDE = "FUNGICIDE", "Fungicide"
        RODENTICIDE = "RODENTICIDE", "Rodenticide"
        NEMATICIDE = "NEMATICIDE", "Nematicide"
        BIOLOGICAL = "BIOLOGICAL", "Biological Control"
        OTHER = "OTHER", "Other"

    pesticide_type = models.CharField(max_length=20, choices=PesticideType.choices)
    active_ingredient = models.CharField(max_length=200, blank=True)
    target_pests = models.CharField(max_length=300, blank=True)
    pre_harvest_interval_days = models.PositiveIntegerField(
        null=True, blank=True, help_text="Days to wait between last application and harvest"
    )
    history = HistoricalRecords()


class PesticideApplication(WithSupplier, WithContentMeasure, models.Model):
    """Bought once but often applied across more than one farm — the
    application itself carries no single farm or planting; each farm's
    portion (and, within that farm, which planting/pest incident it went
    to) lives on PesticideApplicationAllocation instead.
    """

    class Unit(models.TextChoices):
        LITRES = "LITRES", "Litres"
        ML = "ML", "Millilitres"
        KG = "KG", "Kilograms"
        GRAMS = "GRAMS", "Grams"
        SACHETS = "SACHETS", "Sachets"

    pesticide = models.ForeignKey(Pesticide, on_delete=models.CASCADE, related_name="applications")
    date_applied = models.DateField()
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.LITRES)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    applied_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pesticide_applications",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-date_applied"]

    def __str__(self):
        return f"{self.pesticide.name} – {self.date_applied}"

    @property
    def total_cost(self):
        if self.unit_cost is None:
            return None
        return self.quantity * self.unit_cost


class PesticideApplicationAllocation(FarmPortion):
    purchase = models.ForeignKey(
        PesticideApplication, on_delete=models.CASCADE, related_name="allocations"
    )
    planting = models.ForeignKey(
        CropPlanting,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pesticide_application_allocations",
    )
    pest_incident = models.ForeignKey(
        PestIncident,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="application_allocations",
    )
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.purchase.pesticide.name} – {self.farm.name} ({self.quantity})"

    @property
    def total_cost(self):
        if self.purchase.unit_cost is None:
            return None
        return self.quantity * self.purchase.unit_cost


class Seedling(CatalogItem, WithPhoto):
    """Name is expected to carry variety/packaging details itself
    (e.g. "TSAVO 4141 2kg packets") rather than splitting them into a
    separate field.
    """

    crop = models.ForeignKey(
        Crop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="seedlings",
        help_text="Crop type this seedling belongs to",
    )
    maturity_days = models.CharField(
        max_length=50,
        blank=True,
        help_text="Typical days from planting to harvest, e.g. '90-120'",
    )
    history = HistoricalRecords()


class SeedlingPurchase(WithSupplier, WithContentMeasure, models.Model):
    """Bought once but often shared across farms — the purchase carries no
    single farm or planting; each farm's portion (and, within that farm,
    which planting it went to) lives on SeedlingPurchaseAllocation instead.
    """

    class Unit(models.TextChoices):
        SEEDLINGS = "SEEDLINGS", "Seedlings / Units"
        PACKETS = "PACKETS", "Packets"
        TRAYS = "TRAYS", "Trays"
        KG = "KG", "Kilograms"
        BAGS = "BAGS", "Bags"
        SACHETS = "SACHETS", "Sachets"
        TINS = "TINS", "Tins"
        BUCKETS = "BUCKETS", "Buckets"
        SACKS = "SACKS", "Sacks"
        CARTONS = "CARTONS", "Cartons"
        CRATES = "CRATES", "Crates"

    seedling = models.ForeignKey(Seedling, on_delete=models.CASCADE, related_name="purchases")
    purchase_date = models.DateField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.SEEDLINGS)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-purchase_date"]

    def __str__(self):
        return f"{self.seedling.name} x{self.quantity} ({self.purchase_date})"

    @property
    def total_cost(self):
        if self.unit_cost is None:
            return None
        return self.quantity * self.unit_cost


class SeedlingPurchaseAllocation(FarmPortion):
    purchase = models.ForeignKey(
        SeedlingPurchase, on_delete=models.CASCADE, related_name="allocations"
    )
    planting = models.ForeignKey(
        CropPlanting,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="seedling_purchase_allocations",
    )
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.purchase.seedling.name} – {self.farm.name} ({self.quantity})"

    @property
    def total_cost(self):
        if self.purchase.unit_cost is None:
            return None
        return self.quantity * self.purchase.unit_cost


class SoilInput(CatalogItem, WithPhoto):
    class InputType(models.TextChoices):
        LIME = "LIME", "Lime"
        FERTILIZER_ORGANIC = "FERTILIZER_ORGANIC", "Organic Fertilizer / Manure"
        FERTILIZER_SYNTHETIC = "FERTILIZER_SYNTHETIC", "Synthetic Fertilizer"
        GYPSUM = "GYPSUM", "Gypsum"
        MULCH = "MULCH", "Mulch"
        COMPOST = "COMPOST", "Compost"
        OTHER = "OTHER", "Other"

    input_type = models.CharField(max_length=30, choices=InputType.choices)
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.name} ({self.input_type})"


class SoilTreatment(WithSupplier, WithContentMeasure, models.Model):
    """Bought once but often shared across farms — the purchase carries no
    single farm or planting; each farm's portion (and, within that farm,
    which planting it went to) lives on SoilTreatmentAllocation instead.
    Area covered stays here as a whole-purchase aggregate rather than being
    split per farm.
    """

    class Unit(models.TextChoices):
        KG = "KG", "Kilograms"
        BAGS = "BAGS", "Bags"
        TONNES = "TONNES", "Tonnes"
        LITRES = "LITRES", "Litres"

    soil_input = models.ForeignKey(SoilInput, on_delete=models.CASCADE, related_name="treatments")
    date_applied = models.DateField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.KG)
    area_covered_acres = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-date_applied"]

    def __str__(self):
        return f"{self.soil_input.name} ({self.date_applied})"

    @property
    def total_cost(self):
        if self.unit_cost is None:
            return None
        return self.quantity * self.unit_cost


class SoilTreatmentAllocation(FarmPortion):
    purchase = models.ForeignKey(
        SoilTreatment, on_delete=models.CASCADE, related_name="allocations"
    )
    planting = models.ForeignKey(
        CropPlanting,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="soil_treatment_allocations",
    )
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.purchase.soil_input.name} – {self.farm.name} ({self.quantity})"

    @property
    def total_cost(self):
        if self.purchase.unit_cost is None:
            return None
        return self.quantity * self.purchase.unit_cost


class SoilInputPurchase(WithSupplier, WithContentMeasure, models.Model):
    """The buying side of a soil input, mirroring SeedlingPurchase — bought
    once but often shared across farms, with no application-specific
    details (area covered, date applied) of its own. Those stay on
    SoilTreatment, which is the pre-existing 'applying it' record and is
    otherwise untouched by this model's existence.
    """

    class Unit(models.TextChoices):
        KG = "KG", "Kilograms"
        BAGS = "BAGS", "Bags"
        SACKS = "SACKS", "Sacks"
        TINS = "TINS", "Tins"
        BUCKETS = "BUCKETS", "Buckets"
        TONNES = "TONNES", "Tonnes"
        LITRES = "LITRES", "Litres"

    soil_input = models.ForeignKey(SoilInput, on_delete=models.CASCADE, related_name="purchases")
    purchase_date = models.DateField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.KG)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-purchase_date"]

    def __str__(self):
        return f"{self.soil_input.name} x{self.quantity} ({self.purchase_date})"

    @property
    def total_cost(self):
        if self.unit_cost is None:
            return None
        return self.quantity * self.unit_cost


class SoilInputPurchaseAllocation(FarmPortion):
    purchase = models.ForeignKey(
        SoilInputPurchase, on_delete=models.CASCADE, related_name="allocations"
    )
    planting = models.ForeignKey(
        CropPlanting,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="soil_input_purchase_allocations",
    )
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.purchase.soil_input.name} – {self.farm.name} ({self.quantity})"

    @property
    def total_cost(self):
        if self.purchase.unit_cost is None:
            return None
        return self.quantity * self.purchase.unit_cost


class FenceDamage(WithPhoto, models.Model):
    class DamageType(models.TextChoices):
        BROKEN_POSTS = "BROKEN_POSTS", "Broken Posts"
        WIRE_CUT = "WIRE_CUT", "Wire Cut / Snapped"
        GATE_DAMAGED = "GATE_DAMAGED", "Gate Damaged"
        ANIMAL_BREACH = "ANIMAL_BREACH", "Animal Breach"
        EROSION = "EROSION", "Erosion / Wash-Out"
        THEFT = "THEFT", "Theft of Materials"
        OTHER = "OTHER", "Other"

    class RepairStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        REPAIRED = "REPAIRED", "Repaired"

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="fence_damages")
    location_description = models.CharField(max_length=300)
    damage_type = models.CharField(max_length=30, choices=DamageType.choices)
    date_reported = models.DateField()
    severity = models.CharField(
        max_length=20,
        choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High")],
    )
    repair_status = models.CharField(
        max_length=20, choices=RepairStatus.choices, default=RepairStatus.PENDING
    )
    repair_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    date_repaired = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-date_reported"]

    def __str__(self):
        return f"{self.damage_type} @ {self.farm.name} ({self.repair_status})"
