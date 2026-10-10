from datetime import date
from decimal import Decimal
from typing import Optional

import strawberry
import strawberry_django
from strawberry.file_uploads import Upload

from apps.accounts.types import FarmType, SupplierType

from .models import (
    AnimalFeed,
    AnimalTreatment,
    AnimalTreatmentAllocation,
    FeedRecord,
    FeedRecordAllocation,
    VeterinaryDrug,
)


@strawberry_django.type(
    VeterinaryDrug,
    fields=[
        "id",
        "name",
        "drug_type",
        "active_ingredient",
        "target_species",
        "dosage_instructions",
        "withdrawal_period_days",
        "notes",
        "product_url",
    ],
)
class VeterinaryDrugType:
    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


@strawberry_django.type(
    AnimalTreatment,
    fields=[
        "id",
        "animal_type",
        "animal_count_treated",
        "treatment_date",
        "dosage_per_animal",
        "quantity_used",
        "unit",
        "unit_cost",
        "content_amount",
        "content_unit",
        "condition_treated",
        "outcome",
        "notes",
        "created_at",
    ],
)
class AnimalTreatmentType:
    drug: VeterinaryDrugType
    supplier: Optional[SupplierType]
    allocations: list["AnimalTreatmentAllocationType"]

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(AnimalTreatmentAllocation, fields=["id", "quantity"])
class AnimalTreatmentAllocationType:
    farm: FarmType
    purchase: AnimalTreatmentType

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(
    AnimalFeed,
    fields=[
        "id",
        "name",
        "feed_type",
        "target_species",
        "nutritional_info",
        "notes",
        "product_url",
    ],
)
class AnimalFeedType:
    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


@strawberry_django.type(
    FeedRecord,
    fields=[
        "id",
        "animal_type",
        "feed_date",
        "quantity",
        "unit",
        "unit_cost",
        "content_amount",
        "content_unit",
        "animal_count_fed",
        "notes",
        "created_at",
    ],
)
class FeedRecordType:
    feed: AnimalFeedType
    supplier: Optional[SupplierType]
    allocations: list["FeedRecordAllocationType"]

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(FeedRecordAllocation, fields=["id", "quantity"])
class FeedRecordAllocationType:
    farm: FarmType
    purchase: FeedRecordType

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


# ── Inputs ────────────────────────────────────────────────────────────────


@strawberry.input
class VeterinaryDrugInput:
    name: str
    drug_type: str
    active_ingredient: str = ""
    target_species: str = ""
    dosage_instructions: str = ""
    withdrawal_period_days: Optional[int] = None
    notes: str = ""
    product_url: str = ""
    image: Optional[Upload] = None


@strawberry.input
class AnimalTreatmentAllocationInput:
    farm_id: strawberry.ID
    quantity: Decimal


@strawberry.input
class AnimalTreatmentInput:
    animal_type: str
    animal_count_treated: int
    drug_id: strawberry.ID
    treatment_date: date
    dosage_per_animal: str = ""
    quantity_used: Decimal = Decimal("0")
    unit: str = "ML"
    unit_cost: Optional[Decimal] = None
    content_amount: Optional[Decimal] = None
    content_unit: str = ""
    supplier_id: Optional[strawberry.ID] = None
    condition_treated: str = ""
    outcome: str = ""
    notes: str = ""
    allocations: list[AnimalTreatmentAllocationInput] = strawberry.field(default_factory=list)


@strawberry.input
class AnimalFeedInput:
    name: str
    feed_type: str
    target_species: str = ""
    nutritional_info: str = ""
    notes: str = ""
    product_url: str = ""
    image: Optional[Upload] = None


@strawberry.input
class FeedRecordAllocationInput:
    farm_id: strawberry.ID
    quantity: Decimal


@strawberry.input
class FeedRecordInput:
    animal_type: str
    feed_id: strawberry.ID
    feed_date: date
    quantity: Decimal
    unit: str
    unit_cost: Optional[Decimal] = None
    content_amount: Optional[Decimal] = None
    content_unit: str = ""
    supplier_id: Optional[strawberry.ID] = None
    animal_count_fed: Optional[int] = None
    notes: str = ""
    allocations: list[FeedRecordAllocationInput] = strawberry.field(default_factory=list)
