import strawberry
from django.db import transaction

from apps.accounts.models import Farm, FarmMember, Supplier, is_worker_only
from apps.utils import require_auth

from .models import (
    AnimalFeed,
    AnimalTreatment,
    AnimalTreatmentAllocation,
    FeedRecord,
    FeedRecordAllocation,
    VeterinaryDrug,
)
from .types import (
    AnimalFeedInput,
    AnimalFeedType,
    AnimalTreatmentInput,
    AnimalTreatmentType,
    FeedRecordInput,
    FeedRecordType,
    VeterinaryDrugInput,
    VeterinaryDrugType,
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


def _require_catalog_editor(user):
    """Global catalogs (vet drugs, feeds) have no farm of their own, so a
    worker-only user (no OWNER/MANAGER role on any farm) may create new
    catalog entries but not modify or remove existing ones.
    """
    if is_worker_only(user):
        raise PermissionError("Workers can create records but cannot edit or delete them")


def _resolve_supplier(supplier_id):
    return Supplier.objects.get(id=supplier_id) if supplier_id else None


def _require_purchase_access(purchase, user):
    """A shared purchase has no farm of its own — edit/delete access is
    granted if the user is OWNER/MANAGER on at least one farm it's
    currently allocated to (or is a platform admin); a WORKER can create
    these records but not modify or remove them.
    """
    if user.is_staff or user.is_superuser:
        return
    if not purchase.allocations.filter(
        farm__members__user=user, farm__members__role__in=FarmMember.EDITOR_ROLES
    ).exists():
        raise PermissionError("Workers can create records but cannot edit or delete them")


def _require_allocations(allocations):
    """A purchase with zero allocations belongs to no farm and becomes
    permanently invisible from every farm-scoped list — this must be
    rejected rather than silently saved.
    """
    if not allocations:
        raise ValueError("At least one farm allocation is required")


def _set_treatment_allocations(purchase, allocations, user):
    _require_allocations(allocations)
    for a in allocations:
        _farm_member(Farm.objects.get(id=a.farm_id), user)
    purchase.allocations.all().delete()
    for a in allocations:
        AnimalTreatmentAllocation.objects.create(
            purchase=purchase, farm_id=a.farm_id, quantity=a.quantity
        )


def _set_feed_record_allocations(purchase, allocations, user):
    _require_allocations(allocations)
    for a in allocations:
        _farm_member(Farm.objects.get(id=a.farm_id), user)
    purchase.allocations.all().delete()
    for a in allocations:
        FeedRecordAllocation.objects.create(
            purchase=purchase, farm_id=a.farm_id, quantity=a.quantity
        )


@strawberry.type
class InputMutation:
    # ── Veterinary Drugs (global catalog) ───────────────────────────────────
    @strawberry.mutation
    def create_vet_drug(
        self, info: strawberry.Info, input: VeterinaryDrugInput
    ) -> VeterinaryDrugType:
        require_auth(info)
        return VeterinaryDrug.objects.create(**vars(input))

    @strawberry.mutation
    def update_vet_drug(
        self, info: strawberry.Info, drug_id: strawberry.ID, input: VeterinaryDrugInput
    ) -> VeterinaryDrugType:
        user = require_auth(info)
        _require_catalog_editor(user)
        drug = VeterinaryDrug.objects.get(id=drug_id)
        for field, value in vars(input).items():
            if field == "image":
                continue
            setattr(drug, field, value)
        if input.image is not None:
            drug.image = input.image
        drug.save()
        return drug

    @strawberry.mutation
    def delete_vet_drug(self, info: strawberry.Info, drug_id: strawberry.ID) -> bool:
        user = require_auth(info)
        _require_catalog_editor(user)
        VeterinaryDrug.objects.get(id=drug_id).delete()
        return True

    # ── Animal Treatments ────────────────────────────────────────────────────
    @strawberry.mutation
    def record_treatment(
        self, info: strawberry.Info, input: AnimalTreatmentInput
    ) -> AnimalTreatmentType:
        user = require_auth(info)
        with transaction.atomic():
            drug = VeterinaryDrug.objects.get(id=input.drug_id)
            t = AnimalTreatment.objects.create(
                animal_type=input.animal_type,
                animal_count_treated=input.animal_count_treated,
                drug=drug,
                treatment_date=input.treatment_date,
                dosage_per_animal=input.dosage_per_animal,
                quantity_used=input.quantity_used,
                unit=input.unit,
                unit_cost=input.unit_cost,
                content_amount=input.content_amount,
                content_unit=input.content_unit,
                supplier=_resolve_supplier(input.supplier_id),
                administered_by=user,
                condition_treated=input.condition_treated,
                outcome=input.outcome,
                notes=input.notes,
            )
            _set_treatment_allocations(t, input.allocations, user)
        return t

    @strawberry.mutation
    def update_treatment(
        self, info: strawberry.Info, treatment_id: strawberry.ID, input: AnimalTreatmentInput
    ) -> AnimalTreatmentType:
        user = require_auth(info)
        with transaction.atomic():
            t = AnimalTreatment.objects.get(id=treatment_id)
            _require_purchase_access(t, user)
            t.animal_type = input.animal_type
            t.animal_count_treated = input.animal_count_treated
            t.drug = VeterinaryDrug.objects.get(id=input.drug_id)
            t.treatment_date = input.treatment_date
            t.dosage_per_animal = input.dosage_per_animal
            t.quantity_used = input.quantity_used
            t.unit = input.unit
            t.unit_cost = input.unit_cost
            t.content_amount = input.content_amount
            t.content_unit = input.content_unit
            t.supplier = _resolve_supplier(input.supplier_id)
            t.condition_treated = input.condition_treated
            t.outcome = input.outcome
            t.notes = input.notes
            t.save()
            _set_treatment_allocations(t, input.allocations, user)
        return t

    @strawberry.mutation
    def delete_treatment(self, info: strawberry.Info, treatment_id: strawberry.ID) -> bool:
        user = require_auth(info)
        t = AnimalTreatment.objects.get(id=treatment_id)
        _require_purchase_access(t, user)
        t.delete()
        return True

    @strawberry.mutation
    def delete_treatment_allocation(
        self, info: strawberry.Info, allocation_id: strawberry.ID
    ) -> bool:
        user = require_auth(info)
        allocation = AnimalTreatmentAllocation.objects.select_related("purchase").get(
            id=allocation_id
        )
        _farm_editor(allocation.farm, user)
        purchase = allocation.purchase
        allocation.delete()
        if not purchase.allocations.exists():
            purchase.delete()
        return True

    # ── Animal Feed (global catalog) ─────────────────────────────────────────
    @strawberry.mutation
    def create_feed(self, info: strawberry.Info, input: AnimalFeedInput) -> AnimalFeedType:
        require_auth(info)
        return AnimalFeed.objects.create(**vars(input))

    @strawberry.mutation
    def update_feed(
        self, info: strawberry.Info, feed_id: strawberry.ID, input: AnimalFeedInput
    ) -> AnimalFeedType:
        user = require_auth(info)
        _require_catalog_editor(user)
        feed = AnimalFeed.objects.get(id=feed_id)
        for field, value in vars(input).items():
            if field == "image":
                continue
            setattr(feed, field, value)
        if input.image is not None:
            feed.image = input.image
        feed.save()
        return feed

    @strawberry.mutation
    def delete_feed(self, info: strawberry.Info, feed_id: strawberry.ID) -> bool:
        user = require_auth(info)
        _require_catalog_editor(user)
        AnimalFeed.objects.get(id=feed_id).delete()
        return True

    # ── Feed Records ─────────────────────────────────────────────────────────
    @strawberry.mutation
    def record_feeding(self, info: strawberry.Info, input: FeedRecordInput) -> FeedRecordType:
        user = require_auth(info)
        with transaction.atomic():
            feed = AnimalFeed.objects.get(id=input.feed_id)
            rec = FeedRecord.objects.create(
                animal_type=input.animal_type,
                feed=feed,
                feed_date=input.feed_date,
                quantity=input.quantity,
                unit=input.unit,
                unit_cost=input.unit_cost,
                content_amount=input.content_amount,
                content_unit=input.content_unit,
                supplier=_resolve_supplier(input.supplier_id),
                animal_count_fed=input.animal_count_fed,
                notes=input.notes,
            )
            _set_feed_record_allocations(rec, input.allocations, user)
        return rec

    @strawberry.mutation
    def update_feed_record(
        self, info: strawberry.Info, record_id: strawberry.ID, input: FeedRecordInput
    ) -> FeedRecordType:
        user = require_auth(info)
        with transaction.atomic():
            rec = FeedRecord.objects.get(id=record_id)
            _require_purchase_access(rec, user)
            rec.animal_type = input.animal_type
            rec.feed = AnimalFeed.objects.get(id=input.feed_id)
            rec.feed_date = input.feed_date
            rec.quantity = input.quantity
            rec.unit = input.unit
            rec.unit_cost = input.unit_cost
            rec.content_amount = input.content_amount
            rec.content_unit = input.content_unit
            rec.supplier = _resolve_supplier(input.supplier_id)
            rec.animal_count_fed = input.animal_count_fed
            rec.notes = input.notes
            rec.save()
            _set_feed_record_allocations(rec, input.allocations, user)
        return rec

    @strawberry.mutation
    def delete_feed_record(self, info: strawberry.Info, record_id: strawberry.ID) -> bool:
        user = require_auth(info)
        rec = FeedRecord.objects.get(id=record_id)
        _require_purchase_access(rec, user)
        rec.delete()
        return True

    @strawberry.mutation
    def delete_feed_record_allocation(
        self, info: strawberry.Info, allocation_id: strawberry.ID
    ) -> bool:
        user = require_auth(info)
        allocation = FeedRecordAllocation.objects.select_related("purchase").get(id=allocation_id)
        _farm_editor(allocation.farm, user)
        purchase = allocation.purchase
        allocation.delete()
        if not purchase.allocations.exists():
            purchase.delete()
        return True
