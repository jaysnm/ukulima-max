from datetime import date
from typing import Optional

import strawberry
from django.db.models import Sum

from apps.accounts.models import Farm, FarmMember
from apps.utils import require_auth

from .models import AnimalCategory, EggProduction, LivestockCensus, LivestockEvent
from .types import (
    EggProductionType,
    LivestockCensusType,
    LivestockEventType,
    LivestockSummary,
)


def _member_farm(user, farm_id):
    farm = Farm.objects.get(id=farm_id)
    if not FarmMember.objects.filter(farm=farm, user=user).exists():
        raise PermissionError("Not a member of this farm")
    return farm


@strawberry.type
class LivestockQuery:
    @strawberry.field
    def livestock_censuses(
        self, info: strawberry.Info, farm_id: strawberry.ID, animal_type: Optional[str] = None
    ) -> list[LivestockCensusType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        qs = LivestockCensus.objects.filter(farm=farm)
        if animal_type:
            qs = qs.filter(animal_type=animal_type)
        return qs

    @strawberry.field
    def livestock_events(
        self,
        info: strawberry.Info,
        farm_id: strawberry.ID,
        animal_type: Optional[str] = None,
        event_type: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> list[LivestockEventType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        qs = LivestockEvent.objects.filter(farm=farm)
        if animal_type:
            qs = qs.filter(animal_type=animal_type)
        if event_type:
            qs = qs.filter(event_type=event_type)
        if from_date:
            qs = qs.filter(event_date__gte=from_date)
        if to_date:
            qs = qs.filter(event_date__lte=to_date)
        return qs

    @strawberry.field
    def egg_productions(
        self,
        info: strawberry.Info,
        farm_id: strawberry.ID,
        bird_type: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> list[EggProductionType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        qs = EggProduction.objects.filter(farm=farm)
        if bird_type:
            qs = qs.filter(bird_type=bird_type)
        if from_date:
            qs = qs.filter(production_date__gte=from_date)
        if to_date:
            qs = qs.filter(production_date__lte=to_date)
        return qs

    @strawberry.field
    def livestock_summary(
        self, info: strawberry.Info, farm_id: strawberry.ID
    ) -> list[LivestockSummary]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        month_start = date.today().replace(day=1)
        results = []
        for animal_type, _ in AnimalCategory.choices:
            latest = (
                LivestockCensus.objects.filter(farm=farm, animal_type=animal_type)
                .order_by("-census_date")
                .first()
            )
            events = LivestockEvent.objects.filter(
                farm=farm, animal_type=animal_type, event_date__gte=month_start
            )
            results.append(
                LivestockSummary(
                    animal_type=animal_type,
                    latest_count=latest.total_count if latest else 0,
                    births_this_month=events.filter(event_type="BIRTH").aggregate(t=Sum("count"))[
                        "t"
                    ]
                    or 0,
                    deaths_this_month=events.filter(event_type="DEATH").aggregate(t=Sum("count"))[
                        "t"
                    ]
                    or 0,
                    purchases_this_month=events.filter(event_type="PURCHASE").aggregate(
                        t=Sum("count")
                    )["t"]
                    or 0,
                    sales_this_month=events.filter(event_type="SALE").aggregate(t=Sum("count"))["t"]
                    or 0,
                )
            )
        return results
