from datetime import date
from decimal import Decimal
from typing import Optional

import strawberry
import strawberry_django
from strawberry.file_uploads import Upload

from .models import EggProduction, LivestockCensus, LivestockEvent


@strawberry_django.type(
    LivestockCensus,
    fields=[
        "id",
        "animal_type",
        "census_date",
        "total_count",
        "male_count",
        "female_count",
        "juvenile_count",
        "notes",
        "created_at",
    ],
)
class LivestockCensusType:
    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


@strawberry_django.type(
    LivestockEvent,
    fields=[
        "id",
        "animal_type",
        "event_type",
        "event_date",
        "count",
        "unit_value",
        "cause_of_death",
        "notes",
        "created_at",
    ],
)
class LivestockEventType:
    @strawberry.field
    def total_value(self) -> Optional[Decimal]:
        return self.total_value

    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


@strawberry_django.type(
    EggProduction,
    fields=[
        "id",
        "bird_type",
        "production_date",
        "total_eggs",
        "damaged_eggs",
        "sold_eggs",
        "unit_price",
        "notes",
        "created_at",
    ],
)
class EggProductionType:
    good_eggs: int

    @strawberry.field
    def total_revenue(self) -> Optional[Decimal]:
        return self.total_revenue

    @strawberry.field
    def image_url(self) -> Optional[str]:
        return self.image_url


# ── Inputs ──────────────────────────────────────────────────────────────────


@strawberry.input
class LivestockCensusInput:
    farm_id: strawberry.ID
    animal_type: str
    census_date: date
    total_count: int
    male_count: int = 0
    female_count: int = 0
    juvenile_count: int = 0
    notes: str = ""
    image: Optional[Upload] = None


@strawberry.input
class LivestockEventInput:
    farm_id: strawberry.ID
    animal_type: str
    event_type: str
    event_date: date
    count: int
    unit_value: Optional[Decimal] = None
    cause_of_death: str = ""
    notes: str = ""
    image: Optional[Upload] = None


@strawberry.input
class EggProductionInput:
    farm_id: strawberry.ID
    bird_type: str
    production_date: date
    total_eggs: int
    damaged_eggs: int = 0
    sold_eggs: int = 0
    unit_price: Optional[Decimal] = None
    notes: str = ""
    image: Optional[Upload] = None


@strawberry.type
class LivestockSummary:
    animal_type: str
    latest_count: int
    births_this_month: int
    deaths_this_month: int
    purchases_this_month: int
    sales_this_month: int
