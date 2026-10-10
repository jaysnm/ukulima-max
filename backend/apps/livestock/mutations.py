import strawberry

from apps.accounts.models import Farm, FarmMember
from apps.utils import require_auth

from .models import EggProduction, LivestockCensus, LivestockEvent
from .types import (
    EggProductionInput,
    EggProductionType,
    LivestockCensusInput,
    LivestockCensusType,
    LivestockEventInput,
    LivestockEventType,
)


def _farm_member(farm, user):
    if not FarmMember.objects.filter(farm=farm, user=user).exists():
        raise PermissionError("Not a member of this farm")


def _farm_editor(farm, user):
    """Only OWNER/MANAGER (or a platform admin) may edit or delete an
    existing record — a WORKER may create new entries but not modify or
    remove ones that already exist.
    """
    if user.is_staff or user.is_superuser:
        return
    if not FarmMember.objects.filter(
        farm=farm, user=user, role__in=FarmMember.EDITOR_ROLES
    ).exists():
        raise PermissionError("Workers can create records but cannot edit or delete them")


@strawberry.type
class LivestockMutation:
    @strawberry.mutation
    def record_census(
        self, info: strawberry.Info, input: LivestockCensusInput
    ) -> LivestockCensusType:
        user = require_auth(info)
        farm = Farm.objects.get(id=input.farm_id)
        _farm_member(farm, user)
        return LivestockCensus.objects.create(
            farm=farm,
            animal_type=input.animal_type,
            census_date=input.census_date,
            total_count=input.total_count,
            male_count=input.male_count,
            female_count=input.female_count,
            juvenile_count=input.juvenile_count,
            notes=input.notes,
            image=input.image,
        )

    @strawberry.mutation
    def update_census(
        self, info: strawberry.Info, census_id: strawberry.ID, input: LivestockCensusInput
    ) -> LivestockCensusType:
        user = require_auth(info)
        census = LivestockCensus.objects.get(id=census_id)
        _farm_editor(census.farm, user)
        # `image` is only replaced when a new file is actually uploaded —
        # otherwise editing any other field on a record would silently wipe
        # out its existing photo.
        for field, value in vars(input).items():
            if field not in ("farm_id", "image"):
                setattr(census, field, value)
        if input.image is not None:
            census.image = input.image
        census.save()
        return census

    @strawberry.mutation
    def delete_census(self, info: strawberry.Info, census_id: strawberry.ID) -> bool:
        user = require_auth(info)
        census = LivestockCensus.objects.get(id=census_id)
        _farm_editor(census.farm, user)
        census.delete()
        return True

    @strawberry.mutation
    def record_livestock_event(
        self, info: strawberry.Info, input: LivestockEventInput
    ) -> LivestockEventType:
        user = require_auth(info)
        farm = Farm.objects.get(id=input.farm_id)
        _farm_member(farm, user)
        return LivestockEvent.objects.create(
            farm=farm,
            animal_type=input.animal_type,
            event_type=input.event_type,
            event_date=input.event_date,
            count=input.count,
            unit_value=input.unit_value,
            cause_of_death=input.cause_of_death,
            notes=input.notes,
            image=input.image,
        )

    @strawberry.mutation
    def update_livestock_event(
        self, info: strawberry.Info, event_id: strawberry.ID, input: LivestockEventInput
    ) -> LivestockEventType:
        user = require_auth(info)
        event = LivestockEvent.objects.get(id=event_id)
        _farm_editor(event.farm, user)
        event.animal_type = input.animal_type
        event.event_type = input.event_type
        event.event_date = input.event_date
        event.count = input.count
        event.unit_value = input.unit_value
        event.cause_of_death = input.cause_of_death
        event.notes = input.notes
        if input.image is not None:
            event.image = input.image
        event.save()
        return event

    @strawberry.mutation
    def delete_livestock_event(self, info: strawberry.Info, event_id: strawberry.ID) -> bool:
        user = require_auth(info)
        event = LivestockEvent.objects.get(id=event_id)
        _farm_editor(event.farm, user)
        event.delete()
        return True

    @strawberry.mutation
    def record_egg_production(
        self, info: strawberry.Info, input: EggProductionInput
    ) -> EggProductionType:
        user = require_auth(info)
        farm = Farm.objects.get(id=input.farm_id)
        _farm_member(farm, user)
        return EggProduction.objects.create(
            farm=farm,
            bird_type=input.bird_type,
            production_date=input.production_date,
            total_eggs=input.total_eggs,
            damaged_eggs=input.damaged_eggs,
            sold_eggs=input.sold_eggs,
            unit_price=input.unit_price,
            notes=input.notes,
            image=input.image,
        )

    @strawberry.mutation
    def update_egg_production(
        self, info: strawberry.Info, record_id: strawberry.ID, input: EggProductionInput
    ) -> EggProductionType:
        user = require_auth(info)
        rec = EggProduction.objects.get(id=record_id)
        _farm_editor(rec.farm, user)
        rec.bird_type = input.bird_type
        rec.production_date = input.production_date
        rec.total_eggs = input.total_eggs
        rec.damaged_eggs = input.damaged_eggs
        rec.sold_eggs = input.sold_eggs
        rec.unit_price = input.unit_price
        rec.notes = input.notes
        if input.image is not None:
            rec.image = input.image
        rec.save()
        return rec

    @strawberry.mutation
    def delete_egg_production(self, info: strawberry.Info, record_id: strawberry.ID) -> bool:
        user = require_auth(info)
        rec = EggProduction.objects.get(id=record_id)
        _farm_editor(rec.farm, user)
        rec.delete()
        return True
