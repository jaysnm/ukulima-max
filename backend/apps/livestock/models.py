from django.db import models
from simple_history.models import HistoricalRecords

from apps.accounts.models import Farm
from apps.utils import WithPhoto


class AnimalCategory(models.TextChoices):
    # Cattle
    COW = "COW", "Cow"
    GOAT = "GOAT", "Goat"
    SHEEP = "SHEEP", "Sheep"
    # Poultry
    CHICKEN = "CHICKEN", "Chicken"
    DUCK = "DUCK", "Duck"
    TURKEY = "TURKEY", "Turkey"


POULTRY_TYPES = {AnimalCategory.CHICKEN, AnimalCategory.DUCK, AnimalCategory.TURKEY}
CATTLE_TYPES = {AnimalCategory.COW, AnimalCategory.GOAT, AnimalCategory.SHEEP}


class LivestockCensus(WithPhoto, models.Model):
    """Periodic head count snapshot for any animal type."""

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="livestock_censuses")
    animal_type = models.CharField(max_length=20, choices=AnimalCategory.choices)
    census_date = models.DateField()
    total_count = models.PositiveIntegerField()
    male_count = models.PositiveIntegerField(default=0)
    female_count = models.PositiveIntegerField(default=0)
    juvenile_count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-census_date"]
        verbose_name_plural = "Livestock Censuses"

    def __str__(self):
        return f"{self.animal_type} census {self.census_date}: {self.total_count}"


class LivestockEvent(WithPhoto, models.Model):
    class EventType(models.TextChoices):
        BIRTH = "BIRTH", "Birth"
        DEATH = "DEATH", "Death"
        PURCHASE = "PURCHASE", "Purchase"
        SALE = "SALE", "Sale"
        TRANSFER_IN = "TRANSFER_IN", "Transfer In"
        TRANSFER_OUT = "TRANSFER_OUT", "Transfer Out"
        SLAUGHTER = "SLAUGHTER", "Slaughter"

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="livestock_events")
    animal_type = models.CharField(max_length=20, choices=AnimalCategory.choices)
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    event_date = models.DateField()
    count = models.PositiveIntegerField(default=1)
    unit_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Cost (purchase) or revenue (sale/slaughter) per head",
    )
    cause_of_death = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-event_date"]

    def __str__(self):
        return f"{self.animal_type} {self.event_type} x{self.count} ({self.event_date})"

    @property
    def total_value(self):
        if self.unit_value is None:
            return None
        return self.count * self.unit_value


class EggProduction(WithPhoto, models.Model):
    class BirdType(models.TextChoices):
        CHICKEN = "CHICKEN", "Chicken"
        DUCK = "DUCK", "Duck"
        TURKEY = "TURKEY", "Turkey"

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="egg_productions")
    bird_type = models.CharField(max_length=20, choices=BirdType.choices, default=BirdType.CHICKEN)
    production_date = models.DateField()
    total_eggs = models.PositiveIntegerField()
    damaged_eggs = models.PositiveIntegerField(default=0)
    sold_eggs = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Price per egg sold"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-production_date"]

    def __str__(self):
        return f"{self.bird_type} eggs {self.production_date}: {self.total_eggs} total"

    @property
    def good_eggs(self):
        return self.total_eggs - self.damaged_eggs

    @property
    def total_revenue(self):
        if self.unit_price is None:
            return None
        return self.sold_eggs * self.unit_price
