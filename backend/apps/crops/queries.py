from typing import Optional

import strawberry

from apps.accounts.models import Farm, FarmMember
from apps.utils import require_auth

from .models import (
    Crop,
    CropPlanting,
    FenceDamage,
    Pesticide,
    PesticideApplicationAllocation,
    Seedling,
    SeedlingPurchaseAllocation,
    SoilInput,
    SoilInputPurchaseAllocation,
    SoilTreatmentAllocation,
)
from .types import (
    CropPlantingType,
    CropType,
    FenceDamageType,
    PesticideApplicationAllocationType,
    PesticideType,
    SeedlingPurchaseAllocationType,
    SeedlingType,
    SoilInputPurchaseAllocationType,
    SoilInputType,
    SoilTreatmentAllocationType,
)


def _member_farm(user, farm_id):
    farm = Farm.objects.get(id=farm_id)
    if not FarmMember.objects.filter(farm=farm, user=user).exists():
        raise PermissionError("Not a member of this farm")
    return farm


@strawberry.type
class CropQuery:
    @strawberry.field
    def crops(self, info: strawberry.Info) -> list[CropType]:
        require_auth(info)
        return Crop.objects.all()

    @strawberry.field
    def plantings(
        self,
        info: strawberry.Info,
        farm_id: strawberry.ID,
        status: Optional[str] = None,
    ) -> list[CropPlantingType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        qs = (
            CropPlanting.objects.filter(farm=farm)
            .select_related("crop")
            .prefetch_related(
                "yields",
                "damages",
                "pest_incidents",
                "pesticide_application_allocations__purchase__pesticide",
            )
        )
        if status:
            qs = qs.filter(status=status)
        return qs

    @strawberry.field
    def planting(
        self, info: strawberry.Info, planting_id: strawberry.ID
    ) -> Optional[CropPlantingType]:
        user = require_auth(info)
        obj = CropPlanting.objects.filter(id=planting_id).first()
        if not obj:
            return None
        if not FarmMember.objects.filter(farm=obj.farm, user=user).exists():
            raise PermissionError("Not a member of this farm")
        return obj

    @strawberry.field
    def pesticides(self, info: strawberry.Info) -> list[PesticideType]:
        require_auth(info)
        return Pesticide.objects.all()

    @strawberry.field
    def seedlings(self, info: strawberry.Info) -> list[SeedlingType]:
        require_auth(info)
        return Seedling.objects.select_related("crop").all()

    @strawberry.field
    def seedling_purchases(
        self, info: strawberry.Info, farm_id: strawberry.ID
    ) -> list[SeedlingPurchaseAllocationType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        return SeedlingPurchaseAllocation.objects.filter(farm=farm).select_related(
            "purchase__seedling", "purchase__supplier", "planting"
        )

    @strawberry.field
    def pesticide_applications(
        self, info: strawberry.Info, farm_id: strawberry.ID
    ) -> list[PesticideApplicationAllocationType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        return PesticideApplicationAllocation.objects.filter(farm=farm).select_related(
            "purchase__pesticide", "purchase__supplier", "planting__crop", "pest_incident"
        )

    @strawberry.field
    def soil_inputs(self, info: strawberry.Info) -> list[SoilInputType]:
        require_auth(info)
        return SoilInput.objects.all()

    @strawberry.field
    def soil_treatments(
        self, info: strawberry.Info, farm_id: strawberry.ID
    ) -> list[SoilTreatmentAllocationType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        return SoilTreatmentAllocation.objects.filter(farm=farm).select_related(
            "purchase__soil_input", "purchase__supplier", "planting"
        )

    @strawberry.field
    def soil_input_purchases(
        self, info: strawberry.Info, farm_id: strawberry.ID
    ) -> list[SoilInputPurchaseAllocationType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        return SoilInputPurchaseAllocation.objects.filter(farm=farm).select_related(
            "purchase__soil_input", "purchase__supplier", "planting"
        )

    @strawberry.field
    def fence_damages(
        self, info: strawberry.Info, farm_id: strawberry.ID, repair_status: Optional[str] = None
    ) -> list[FenceDamageType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        qs = FenceDamage.objects.filter(farm=farm)
        if repair_status:
            qs = qs.filter(repair_status=repair_status)
        return qs
