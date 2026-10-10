from datetime import date
from decimal import Decimal
from typing import Optional

import strawberry
import strawberry_django
from strawberry.file_uploads import Upload

from apps.accounts.types import FarmType, SupplierType

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


@strawberry_django.type(
    Crop,
    fields=["id", "name", "category", "notes", "created_at"],
)
class CropType:
    pass


@strawberry_django.type(
    CropYield,
    fields=[
        "id",
        "harvest_date",
        "quantity",
        "unit",
        "quality_grade",
        "unit_price",
        "notes",
        "created_at",
    ],
)
class CropYieldType:
    @strawberry.field
    def total_revenue(self) -> Optional[Decimal]:
        return self.total_revenue


@strawberry_django.type(
    CropDamage,
    fields=[
        "id",
        "damage_type",
        "severity",
        "date_reported",
        "area_affected_acres",
        "estimated_loss_value",
        "description",
        "created_at",
    ],
)
class CropDamageType:
    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


@strawberry_django.type(
    PestIncident,
    fields=[
        "id",
        "pest_name",
        "date_observed",
        "severity",
        "area_affected_acres",
        "action_taken",
        "notes",
        "created_at",
    ],
)
class PestIncidentType:
    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


@strawberry_django.type(
    Pesticide,
    fields=[
        "id",
        "name",
        "pesticide_type",
        "active_ingredient",
        "target_pests",
        "pre_harvest_interval_days",
        "notes",
        "product_url",
    ],
)
class PesticideType:
    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


@strawberry_django.type(
    PesticideApplication,
    fields=[
        "id",
        "date_applied",
        "quantity",
        "unit",
        "unit_cost",
        "content_amount",
        "content_unit",
        "notes",
        "created_at",
    ],
)
class PesticideApplicationType:
    pesticide: PesticideType
    supplier: Optional[SupplierType]
    allocations: list["PesticideApplicationAllocationType"]

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(PesticideApplicationAllocation, fields=["id", "quantity"])
class PesticideApplicationAllocationType:
    farm: FarmType
    planting: Optional["CropPlantingType"]
    pest_incident: Optional[PestIncidentType]
    purchase: PesticideApplicationType

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(
    Seedling,
    fields=["id", "name", "maturity_days", "notes", "product_url"],
)
class SeedlingType:
    crop: Optional[CropType]

    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


@strawberry_django.type(
    CropPlanting,
    fields=[
        "id",
        "acreage",
        "planting_date",
        "expected_harvest_date",
        "season",
        "status",
        "notes",
        "seedling_quantity_kg",
        "created_at",
        "updated_at",
    ],
)
class CropPlantingType:
    crop: CropType
    seedling: Optional[SeedlingType]
    yields: list[CropYieldType]
    damages: list[CropDamageType]
    pest_incidents: list[PestIncidentType]

    @strawberry.field
    def pesticide_applications(self) -> list[PesticideApplicationAllocationType]:
        return self.pesticide_application_allocations.all()

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost

    @strawberry.field
    def total_revenue(self) -> Optional[Decimal]:
        return self.total_revenue

    @strawberry.field
    def profit(self) -> Optional[Decimal]:
        return self.profit


@strawberry_django.type(
    SeedlingPurchase,
    fields=[
        "id",
        "purchase_date",
        "quantity",
        "unit",
        "unit_cost",
        "content_amount",
        "content_unit",
        "notes",
        "created_at",
    ],
)
class SeedlingPurchaseType:
    seedling: SeedlingType
    supplier: Optional[SupplierType]
    allocations: list["SeedlingPurchaseAllocationType"]

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(SeedlingPurchaseAllocation, fields=["id", "quantity"])
class SeedlingPurchaseAllocationType:
    farm: FarmType
    planting: Optional[CropPlantingType]
    purchase: SeedlingPurchaseType

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(
    SoilInput,
    fields=["id", "name", "input_type", "notes", "product_url"],
)
class SoilInputType:
    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


@strawberry_django.type(
    SoilTreatment,
    fields=[
        "id",
        "date_applied",
        "quantity",
        "unit",
        "area_covered_acres",
        "unit_cost",
        "content_amount",
        "content_unit",
        "notes",
        "created_at",
    ],
)
class SoilTreatmentType:
    soil_input: SoilInputType
    supplier: Optional[SupplierType]
    allocations: list["SoilTreatmentAllocationType"]

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(SoilTreatmentAllocation, fields=["id", "quantity"])
class SoilTreatmentAllocationType:
    farm: FarmType
    planting: Optional[CropPlantingType]
    purchase: SoilTreatmentType

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(
    SoilInputPurchase,
    fields=[
        "id",
        "purchase_date",
        "quantity",
        "unit",
        "unit_cost",
        "content_amount",
        "content_unit",
        "notes",
        "created_at",
    ],
)
class SoilInputPurchaseType:
    soil_input: SoilInputType
    supplier: Optional[SupplierType]
    allocations: list["SoilInputPurchaseAllocationType"]

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(SoilInputPurchaseAllocation, fields=["id", "quantity"])
class SoilInputPurchaseAllocationType:
    farm: FarmType
    planting: Optional[CropPlantingType]
    purchase: SoilInputPurchaseType

    @strawberry.field
    def total_cost(self) -> Optional[Decimal]:
        return self.total_cost


@strawberry_django.type(
    FenceDamage,
    fields=[
        "id",
        "location_description",
        "damage_type",
        "date_reported",
        "severity",
        "repair_status",
        "repair_cost",
        "date_repaired",
        "notes",
        "created_at",
    ],
)
class FenceDamageType:
    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


# ── Inputs ─────────────────────────────────────────────────────────────────
@strawberry.input
class CropInput:
    name: str
    category: str = "OTHER"
    notes: str = ""


@strawberry.input
class CropPlantingInput:
    farm_id: strawberry.ID
    crop_id: strawberry.ID
    seedling_id: Optional[strawberry.ID] = None
    seedling_quantity_kg: Optional[Decimal] = None
    acreage: Decimal
    planting_date: date
    expected_harvest_date: Optional[date] = None
    season: str = ""
    notes: str = ""


@strawberry.input
class CropPlantingUpdateInput:
    crop_id: strawberry.ID
    seedling_id: Optional[strawberry.ID] = None
    seedling_quantity_kg: Optional[Decimal] = None
    acreage: Decimal
    planting_date: date
    expected_harvest_date: Optional[date] = None
    season: str = ""
    status: str = "ACTIVE"
    notes: str = ""


@strawberry.input
class CropYieldInput:
    planting_id: strawberry.ID
    harvest_date: date
    quantity: Decimal
    unit: str
    quality_grade: str = ""
    unit_price: Optional[Decimal] = None
    notes: str = ""


@strawberry.input
class CropDamageInput:
    planting_id: strawberry.ID
    damage_type: str
    severity: str
    date_reported: date
    area_affected_acres: Decimal
    estimated_loss_value: Optional[Decimal] = None
    description: str = ""
    image: Optional[Upload] = None


@strawberry.input
class PestIncidentInput:
    planting_id: strawberry.ID
    pest_name: str
    date_observed: date
    severity: str
    area_affected_acres: Decimal
    action_taken: str = ""
    notes: str = ""
    image: Optional[Upload] = None


@strawberry.input
class PesticideInput:
    name: str
    pesticide_type: str
    active_ingredient: str = ""
    target_pests: str = ""
    pre_harvest_interval_days: Optional[int] = None
    notes: str = ""
    product_url: str = ""
    image: Optional[Upload] = None


@strawberry.input
class PesticideApplicationAllocationInput:
    farm_id: strawberry.ID
    quantity: Decimal
    planting_id: Optional[strawberry.ID] = None
    pest_incident_id: Optional[strawberry.ID] = None


@strawberry.input
class PesticideApplicationInput:
    pesticide_id: strawberry.ID
    date_applied: date
    quantity: Decimal
    unit: str
    unit_cost: Optional[Decimal] = None
    content_amount: Optional[Decimal] = None
    content_unit: str = ""
    supplier_id: Optional[strawberry.ID] = None
    notes: str = ""
    allocations: list[PesticideApplicationAllocationInput] = strawberry.field(default_factory=list)


@strawberry.input
class SeedlingInput:
    name: str
    crop_id: Optional[strawberry.ID] = None
    maturity_days: str = ""
    notes: str = ""
    product_url: str = ""
    image: Optional[Upload] = None


@strawberry.input
class SeedlingPurchaseAllocationInput:
    farm_id: strawberry.ID
    quantity: Decimal
    planting_id: Optional[strawberry.ID] = None


@strawberry.input
class SeedlingPurchaseInput:
    seedling_id: strawberry.ID
    purchase_date: date
    quantity: Decimal
    unit: str = "SEEDLINGS"
    unit_cost: Optional[Decimal] = None
    content_amount: Optional[Decimal] = None
    content_unit: str = ""
    supplier_id: Optional[strawberry.ID] = None
    notes: str = ""
    allocations: list[SeedlingPurchaseAllocationInput] = strawberry.field(default_factory=list)


@strawberry.input
class SoilInputCatalogInput:
    name: str
    input_type: str
    notes: str = ""
    product_url: str = ""
    image: Optional[Upload] = None


@strawberry.input
class SoilTreatmentAllocationInput:
    farm_id: strawberry.ID
    quantity: Decimal
    planting_id: Optional[strawberry.ID] = None


@strawberry.input
class SoilTreatmentInput:
    soil_input_id: strawberry.ID
    date_applied: date
    quantity: Decimal
    unit: str = "KG"
    area_covered_acres: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    content_amount: Optional[Decimal] = None
    content_unit: str = ""
    supplier_id: Optional[strawberry.ID] = None
    notes: str = ""
    allocations: list[SoilTreatmentAllocationInput] = strawberry.field(default_factory=list)


@strawberry.input
class SoilInputPurchaseAllocationInput:
    farm_id: strawberry.ID
    quantity: Decimal
    planting_id: Optional[strawberry.ID] = None


@strawberry.input
class SoilInputPurchaseInput:
    soil_input_id: strawberry.ID
    purchase_date: date
    quantity: Decimal
    unit: str = "KG"
    unit_cost: Optional[Decimal] = None
    content_amount: Optional[Decimal] = None
    content_unit: str = ""
    supplier_id: Optional[strawberry.ID] = None
    notes: str = ""
    allocations: list[SoilInputPurchaseAllocationInput] = strawberry.field(default_factory=list)


@strawberry.input
class FenceDamageInput:
    farm_id: strawberry.ID
    location_description: str
    damage_type: str
    date_reported: date
    severity: str
    notes: str = ""
    image: Optional[Upload] = None


@strawberry.input
class FenceRepairInput:
    repair_status: str
    repair_cost: Optional[Decimal] = None
    date_repaired: Optional[date] = None
    notes: str = ""
