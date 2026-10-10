from django.contrib.auth.models import User
from django.db import models
from simple_history.models import HistoricalRecords

from apps.utils import CatalogItem


class Supplier(CatalogItem):
    """Global directory of suppliers — the same agro-shop, vet, or hardware
    store is reused across seedling purchases, pesticide applications,
    treatments, feed records, and soil treatments, so fixing a phone number
    here corrects it everywhere that supplier is referenced instead of the
    same free-text name being retyped (and misspelled) per record.
    """

    phone = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=300, blank=True)
    history = HistoricalRecords()


class WithSupplier(models.Model):
    """Optional link to a Supplier — mixed into any record model that used
    to store the supplier as a free-text string.
    """

    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        abstract = True


class ContentUnit(models.TextChoices):
    KG = "KG", "Kilograms"
    GRAMS = "GRAMS", "Grams"
    LITRES = "LITRES", "Litres"
    ML = "ML", "Millilitres"
    UNITS = "UNITS", "Units"


class WithContentMeasure(models.Model):
    """Purchases are often recorded in a container unit (packets, bags,
    sachets) whose real physical size varies by batch, so this captures what
    one purchase unit actually contains (e.g. "1 packet = 2 kg") on the
    purchase itself, rather than assuming a fixed size on the catalog item —
    letting allocations report true physical quantities, not just ambiguous
    container counts.
    """

    content_amount = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="How much one purchase unit contains, e.g. 2 for '1 packet = 2 kg'",
    )
    content_unit = models.CharField(max_length=20, choices=ContentUnit.choices, blank=True)

    class Meta:
        abstract = True


class Farm(models.Model):
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=300)
    size_acres = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_farms")
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class FarmMember(models.Model):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        MANAGER = "MANAGER", "Manager"
        WORKER = "WORKER", "Worker"

    EDITOR_ROLES = [Role.OWNER, Role.MANAGER]

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="farm_memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.WORKER)
    joined_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        unique_together = ("farm", "user")
        ordering = ["role", "user__username"]

    def __str__(self):
        return f"{self.user.username} @ {self.farm.name} ({self.role})"


def is_worker_only(user) -> bool:
    """True when every farm this user belongs to, they hold WORKER — i.e.
    they have no OWNER/MANAGER role anywhere. A brand-new user with no farm
    memberships at all is *not* worker-only (that's the normal bootstrap
    case: anyone can create their first farm and become its OWNER).

    Used to gate editing/deleting existing records and global catalog
    entries: a worker-only user may create new entries but never modify or
    remove ones that already exist.
    """
    if user.is_staff or user.is_superuser:
        return False
    roles = set(FarmMember.objects.filter(user=user).values_list("role", flat=True))
    return roles == {FarmMember.Role.WORKER}


class FarmPortion(models.Model):
    """A single farm's explicit share of a purchase that's bought once but
    used across multiple farms — the purchase itself carries no farm, only
    its allocations do, so 'shared 60/40 between two farms' is representable
    without duplicating the purchase record.
    """

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="+")
    quantity = models.DecimalField(max_digits=10, decimal_places=3)

    class Meta:
        abstract = True
