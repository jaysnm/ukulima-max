from datetime import date
from typing import Optional

import strawberry

from apps.accounts.models import Farm, FarmMember
from apps.utils import require_auth

from .models import (
    AnimalFeed,
    AnimalTreatmentAllocation,
    FeedRecordAllocation,
    VeterinaryDrug,
)
from .types import (
    AnimalFeedType,
    AnimalTreatmentAllocationType,
    FeedRecordAllocationType,
    VeterinaryDrugType,
)


def _member_farm(user, farm_id):
    farm = Farm.objects.get(id=farm_id)
    if not FarmMember.objects.filter(farm=farm, user=user).exists():
        raise PermissionError("Not a member of this farm")
    return farm


@strawberry.type
class InputQuery:
    @strawberry.field
    def vet_drugs(self, info: strawberry.Info) -> list[VeterinaryDrugType]:
        require_auth(info)
        return VeterinaryDrug.objects.all()

    @strawberry.field
    def treatments(
        self,
        info: strawberry.Info,
        farm_id: strawberry.ID,
        animal_type: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> list[AnimalTreatmentAllocationType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        qs = AnimalTreatmentAllocation.objects.filter(farm=farm).select_related(
            "purchase__drug", "purchase__supplier"
        )
        if animal_type:
            qs = qs.filter(purchase__animal_type=animal_type)
        if from_date:
            qs = qs.filter(purchase__treatment_date__gte=from_date)
        if to_date:
            qs = qs.filter(purchase__treatment_date__lte=to_date)
        return qs

    @strawberry.field
    def animal_feeds(self, info: strawberry.Info) -> list[AnimalFeedType]:
        require_auth(info)
        return AnimalFeed.objects.all()

    @strawberry.field
    def feed_records(
        self,
        info: strawberry.Info,
        farm_id: strawberry.ID,
        animal_type: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> list[FeedRecordAllocationType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        qs = FeedRecordAllocation.objects.filter(farm=farm).select_related(
            "purchase__feed", "purchase__supplier"
        )
        if animal_type:
            qs = qs.filter(purchase__animal_type=animal_type)
        if from_date:
            qs = qs.filter(purchase__feed_date__gte=from_date)
        if to_date:
            qs = qs.filter(purchase__feed_date__lte=to_date)
        return qs
