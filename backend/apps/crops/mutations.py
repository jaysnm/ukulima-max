import strawberry
from django.db import transaction

from apps.accounts.models import Farm, FarmMember, Supplier, is_worker_only
from apps.utils import require_auth

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
from .types import (
    CropDamageInput,
    CropDamageType,
    CropInput,
    CropPlantingInput,
    CropPlantingType,
    CropPlantingUpdateInput,
    CropType,
    CropYieldInput,
    CropYieldType,
    FenceDamageInput,
    FenceDamageType,
    FenceRepairInput,
    PesticideApplicationInput,
    PesticideApplicationType,
    PesticideInput,
    PesticideType,
    PestIncidentInput,
    PestIncidentType,
    SeedlingInput,
    SeedlingPurchaseInput,
    SeedlingPurchaseType,
    SeedlingType,
    SoilInputCatalogInput,
    SoilInputPurchaseInput,
    SoilInputPurchaseType,
    SoilInputType,
    SoilTreatmentInput,
    SoilTreatmentType,
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
    """Global catalogs (crops, pesticides, seedlings, soil inputs) have no
    farm of their own, so a worker-only user (no OWNER/MANAGER role on any
    farm) may create new catalog entries but not modify or remove existing
    ones.
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


def _set_seedling_allocations(purchase, allocations, user):
    _require_allocations(allocations)
    for a in allocations:
        _farm_member(Farm.objects.get(id=a.farm_id), user)
    purchase.allocations.all().delete()
    for a in allocations:
        planting = CropPlanting.objects.get(id=a.planting_id) if a.planting_id else None
        SeedlingPurchaseAllocation.objects.create(
            purchase=purchase, farm_id=a.farm_id, quantity=a.quantity, planting=planting
        )


def _set_soil_treatment_allocations(purchase, allocations, user):
    _require_allocations(allocations)
    for a in allocations:
        _farm_member(Farm.objects.get(id=a.farm_id), user)
    purchase.allocations.all().delete()
    for a in allocations:
        planting = CropPlanting.objects.get(id=a.planting_id) if a.planting_id else None
        SoilTreatmentAllocation.objects.create(
            purchase=purchase, farm_id=a.farm_id, quantity=a.quantity, planting=planting
        )


def _set_soil_input_purchase_allocations(purchase, allocations, user):
    _require_allocations(allocations)
    for a in allocations:
        _farm_member(Farm.objects.get(id=a.farm_id), user)
    purchase.allocations.all().delete()
    for a in allocations:
        planting = CropPlanting.objects.get(id=a.planting_id) if a.planting_id else None
        SoilInputPurchaseAllocation.objects.create(
            purchase=purchase, farm_id=a.farm_id, quantity=a.quantity, planting=planting
        )


def _set_pesticide_application_allocations(purchase, allocations, user):
    _require_allocations(allocations)
    for a in allocations:
        _farm_member(Farm.objects.get(id=a.farm_id), user)
    purchase.allocations.all().delete()
    for a in allocations:
        planting = CropPlanting.objects.get(id=a.planting_id) if a.planting_id else None
        pest_incident = (
            PestIncident.objects.get(id=a.pest_incident_id) if a.pest_incident_id else None
        )
        PesticideApplicationAllocation.objects.create(
            purchase=purchase,
            farm_id=a.farm_id,
            quantity=a.quantity,
            planting=planting,
            pest_incident=pest_incident,
        )


@strawberry.type
class CropMutation:
    # ── Crop (global catalog) ─────────────────────────────────────────────
    @strawberry.mutation
    def create_crop(self, info: strawberry.Info, input: CropInput) -> CropType:
        require_auth(info)
        return Crop.objects.create(**vars(input))

    @strawberry.mutation
    def update_crop(
        self, info: strawberry.Info, crop_id: strawberry.ID, input: CropInput
    ) -> CropType:
        user = require_auth(info)
        _require_catalog_editor(user)
        crop = Crop.objects.get(id=crop_id)
        for field, value in vars(input).items():
            setattr(crop, field, value)
        crop.save()
        return crop

    @strawberry.mutation
    def delete_crop(self, info: strawberry.Info, crop_id: strawberry.ID) -> bool:
        user = require_auth(info)
        _require_catalog_editor(user)
        Crop.objects.get(id=crop_id).delete()
        return True

    # ── Planting ────────────────────────────────────────────────────────────
    @strawberry.mutation
    def create_planting(self, info: strawberry.Info, input: CropPlantingInput) -> CropPlantingType:
        user = require_auth(info)
        farm = Farm.objects.get(id=input.farm_id)
        _farm_member(farm, user)
        crop = Crop.objects.get(id=input.crop_id)
        seedling = Seedling.objects.get(id=input.seedling_id) if input.seedling_id else None
        return CropPlanting.objects.create(
            farm=farm,
            crop=crop,
            seedling=seedling,
            seedling_quantity_kg=input.seedling_quantity_kg,
            acreage=input.acreage,
            planting_date=input.planting_date,
            expected_harvest_date=input.expected_harvest_date,
            season=input.season,
            notes=input.notes,
        )

    @strawberry.mutation
    def update_planting(
        self, info: strawberry.Info, planting_id: strawberry.ID, input: CropPlantingUpdateInput
    ) -> CropPlantingType:
        user = require_auth(info)
        planting = CropPlanting.objects.get(id=planting_id)
        _farm_editor(planting.farm, user)
        planting.crop = Crop.objects.get(id=input.crop_id)
        planting.seedling = (
            Seedling.objects.get(id=input.seedling_id) if input.seedling_id else None
        )
        planting.seedling_quantity_kg = input.seedling_quantity_kg
        planting.acreage = input.acreage
        planting.planting_date = input.planting_date
        planting.expected_harvest_date = input.expected_harvest_date
        planting.season = input.season
        planting.status = input.status
        planting.notes = input.notes
        planting.save()
        return planting

    @strawberry.mutation
    def update_planting_status(
        self, info: strawberry.Info, planting_id: strawberry.ID, status: str
    ) -> CropPlantingType:
        user = require_auth(info)
        planting = CropPlanting.objects.get(id=planting_id)
        _farm_editor(planting.farm, user)
        planting.status = status
        planting.save()
        return planting

    @strawberry.mutation
    def delete_planting(self, info: strawberry.Info, planting_id: strawberry.ID) -> bool:
        user = require_auth(info)
        planting = CropPlanting.objects.get(id=planting_id)
        _farm_editor(planting.farm, user)
        planting.delete()
        return True

    # ── Yield ────────────────────────────────────────────────────────────────
    @strawberry.mutation
    def record_yield(self, info: strawberry.Info, input: CropYieldInput) -> CropYieldType:
        user = require_auth(info)
        planting = CropPlanting.objects.get(id=input.planting_id)
        _farm_member(planting.farm, user)
        return CropYield.objects.create(
            planting=planting,
            harvest_date=input.harvest_date,
            quantity=input.quantity,
            unit=input.unit,
            quality_grade=input.quality_grade,
            unit_price=input.unit_price,
            notes=input.notes,
        )

    @strawberry.mutation
    def update_yield(
        self, info: strawberry.Info, yield_id: strawberry.ID, input: CropYieldInput
    ) -> CropYieldType:
        user = require_auth(info)
        obj = CropYield.objects.get(id=yield_id)
        _farm_editor(obj.planting.farm, user)
        obj.harvest_date = input.harvest_date
        obj.quantity = input.quantity
        obj.unit = input.unit
        obj.quality_grade = input.quality_grade
        obj.unit_price = input.unit_price
        obj.notes = input.notes
        obj.save()
        return obj

    @strawberry.mutation
    def delete_yield(self, info: strawberry.Info, yield_id: strawberry.ID) -> bool:
        user = require_auth(info)
        obj = CropYield.objects.get(id=yield_id)
        _farm_editor(obj.planting.farm, user)
        obj.delete()
        return True

    # ── Damage ───────────────────────────────────────────────────────────────
    @strawberry.mutation
    def report_crop_damage(self, info: strawberry.Info, input: CropDamageInput) -> CropDamageType:
        user = require_auth(info)
        planting = CropPlanting.objects.get(id=input.planting_id)
        _farm_member(planting.farm, user)
        return CropDamage.objects.create(
            planting=planting,
            damage_type=input.damage_type,
            severity=input.severity,
            date_reported=input.date_reported,
            area_affected_acres=input.area_affected_acres,
            estimated_loss_value=input.estimated_loss_value,
            description=input.description,
            image=input.image,
        )

    @strawberry.mutation
    def update_crop_damage(
        self, info: strawberry.Info, damage_id: strawberry.ID, input: CropDamageInput
    ) -> CropDamageType:
        user = require_auth(info)
        obj = CropDamage.objects.get(id=damage_id)
        _farm_editor(obj.planting.farm, user)
        obj.damage_type = input.damage_type
        obj.severity = input.severity
        obj.date_reported = input.date_reported
        obj.area_affected_acres = input.area_affected_acres
        obj.estimated_loss_value = input.estimated_loss_value
        obj.description = input.description
        if input.image is not None:
            obj.image = input.image
        obj.save()
        return obj

    @strawberry.mutation
    def delete_crop_damage(self, info: strawberry.Info, damage_id: strawberry.ID) -> bool:
        user = require_auth(info)
        obj = CropDamage.objects.get(id=damage_id)
        _farm_editor(obj.planting.farm, user)
        obj.delete()
        return True

    # ── Pest ─────────────────────────────────────────────────────────────────
    @strawberry.mutation
    def report_pest_incident(
        self, info: strawberry.Info, input: PestIncidentInput
    ) -> PestIncidentType:
        user = require_auth(info)
        planting = CropPlanting.objects.get(id=input.planting_id)
        _farm_member(planting.farm, user)
        return PestIncident.objects.create(
            planting=planting,
            pest_name=input.pest_name,
            date_observed=input.date_observed,
            severity=input.severity,
            area_affected_acres=input.area_affected_acres,
            action_taken=input.action_taken,
            notes=input.notes,
            image=input.image,
        )

    @strawberry.mutation
    def update_pest_incident(
        self, info: strawberry.Info, incident_id: strawberry.ID, input: PestIncidentInput
    ) -> PestIncidentType:
        user = require_auth(info)
        obj = PestIncident.objects.get(id=incident_id)
        _farm_editor(obj.planting.farm, user)
        obj.pest_name = input.pest_name
        obj.date_observed = input.date_observed
        obj.severity = input.severity
        obj.area_affected_acres = input.area_affected_acres
        obj.action_taken = input.action_taken
        obj.notes = input.notes
        if input.image is not None:
            obj.image = input.image
        obj.save()
        return obj

    @strawberry.mutation
    def delete_pest_incident(self, info: strawberry.Info, incident_id: strawberry.ID) -> bool:
        user = require_auth(info)
        obj = PestIncident.objects.get(id=incident_id)
        _farm_editor(obj.planting.farm, user)
        obj.delete()
        return True

    # ── Pesticide (global catalog) ────────────────────────────────────────────
    @strawberry.mutation
    def create_pesticide(self, info: strawberry.Info, input: PesticideInput) -> PesticideType:
        require_auth(info)
        return Pesticide.objects.create(**vars(input))

    @strawberry.mutation
    def update_pesticide(
        self, info: strawberry.Info, pesticide_id: strawberry.ID, input: PesticideInput
    ) -> PesticideType:
        user = require_auth(info)
        _require_catalog_editor(user)
        obj = Pesticide.objects.get(id=pesticide_id)
        for field, value in vars(input).items():
            if field == "image":
                continue
            setattr(obj, field, value)
        if input.image is not None:
            obj.image = input.image
        obj.save()
        return obj

    @strawberry.mutation
    def delete_pesticide(self, info: strawberry.Info, pesticide_id: strawberry.ID) -> bool:
        user = require_auth(info)
        _require_catalog_editor(user)
        Pesticide.objects.get(id=pesticide_id).delete()
        return True

    @strawberry.mutation
    def apply_pesticide(
        self, info: strawberry.Info, input: PesticideApplicationInput
    ) -> PesticideApplicationType:
        user = require_auth(info)
        with transaction.atomic():
            pesticide = Pesticide.objects.get(id=input.pesticide_id)
            obj = PesticideApplication.objects.create(
                pesticide=pesticide,
                date_applied=input.date_applied,
                quantity=input.quantity,
                unit=input.unit,
                unit_cost=input.unit_cost,
                content_amount=input.content_amount,
                content_unit=input.content_unit,
                supplier=_resolve_supplier(input.supplier_id),
                applied_by=user,
                notes=input.notes,
            )
            _set_pesticide_application_allocations(obj, input.allocations, user)
        return obj

    @strawberry.mutation
    def update_pesticide_application(
        self, info: strawberry.Info, application_id: strawberry.ID, input: PesticideApplicationInput
    ) -> PesticideApplicationType:
        user = require_auth(info)
        with transaction.atomic():
            obj = PesticideApplication.objects.get(id=application_id)
            _require_purchase_access(obj, user)
            obj.pesticide = Pesticide.objects.get(id=input.pesticide_id)
            obj.date_applied = input.date_applied
            obj.quantity = input.quantity
            obj.unit = input.unit
            obj.unit_cost = input.unit_cost
            obj.content_amount = input.content_amount
            obj.content_unit = input.content_unit
            obj.supplier = _resolve_supplier(input.supplier_id)
            obj.notes = input.notes
            obj.save()
            _set_pesticide_application_allocations(obj, input.allocations, user)
        return obj

    @strawberry.mutation
    def delete_pesticide_application(
        self, info: strawberry.Info, application_id: strawberry.ID
    ) -> bool:
        user = require_auth(info)
        obj = PesticideApplication.objects.get(id=application_id)
        _require_purchase_access(obj, user)
        obj.delete()
        return True

    @strawberry.mutation
    def delete_pesticide_application_allocation(
        self, info: strawberry.Info, allocation_id: strawberry.ID
    ) -> bool:
        user = require_auth(info)
        allocation = PesticideApplicationAllocation.objects.select_related("purchase").get(
            id=allocation_id
        )
        _farm_editor(allocation.farm, user)
        purchase = allocation.purchase
        allocation.delete()
        if not purchase.allocations.exists():
            purchase.delete()
        return True

    # ── Seedlings (global catalog) ───────────────────────────────────────────
    @strawberry.mutation
    def create_seedling(self, info: strawberry.Info, input: SeedlingInput) -> SeedlingType:
        require_auth(info)
        crop = Crop.objects.get(id=input.crop_id) if input.crop_id else None
        return Seedling.objects.create(
            name=input.name,
            crop=crop,
            maturity_days=input.maturity_days,
            notes=input.notes,
            product_url=input.product_url,
            image=input.image,
        )

    @strawberry.mutation
    def update_seedling(
        self, info: strawberry.Info, seedling_id: strawberry.ID, input: SeedlingInput
    ) -> SeedlingType:
        user = require_auth(info)
        _require_catalog_editor(user)
        obj = Seedling.objects.get(id=seedling_id)
        obj.name = input.name
        obj.crop = Crop.objects.get(id=input.crop_id) if input.crop_id else None
        obj.maturity_days = input.maturity_days
        obj.notes = input.notes
        obj.product_url = input.product_url
        if input.image is not None:
            obj.image = input.image
        obj.save()
        return obj

    @strawberry.mutation
    def delete_seedling(self, info: strawberry.Info, seedling_id: strawberry.ID) -> bool:
        user = require_auth(info)
        _require_catalog_editor(user)
        Seedling.objects.get(id=seedling_id).delete()
        return True

    @strawberry.mutation
    def record_seedling_purchase(
        self, info: strawberry.Info, input: SeedlingPurchaseInput
    ) -> SeedlingPurchaseType:
        user = require_auth(info)
        with transaction.atomic():
            seedling = Seedling.objects.get(id=input.seedling_id)
            obj = SeedlingPurchase.objects.create(
                seedling=seedling,
                purchase_date=input.purchase_date,
                quantity=input.quantity,
                unit=input.unit,
                unit_cost=input.unit_cost,
                content_amount=input.content_amount,
                content_unit=input.content_unit,
                supplier=_resolve_supplier(input.supplier_id),
                notes=input.notes,
            )
            _set_seedling_allocations(obj, input.allocations, user)
        return obj

    @strawberry.mutation
    def update_seedling_purchase(
        self, info: strawberry.Info, purchase_id: strawberry.ID, input: SeedlingPurchaseInput
    ) -> SeedlingPurchaseType:
        user = require_auth(info)
        with transaction.atomic():
            obj = SeedlingPurchase.objects.get(id=purchase_id)
            _require_purchase_access(obj, user)
            obj.seedling = Seedling.objects.get(id=input.seedling_id)
            obj.purchase_date = input.purchase_date
            obj.quantity = input.quantity
            obj.unit = input.unit
            obj.unit_cost = input.unit_cost
            obj.content_amount = input.content_amount
            obj.content_unit = input.content_unit
            obj.supplier = _resolve_supplier(input.supplier_id)
            obj.notes = input.notes
            obj.save()
            _set_seedling_allocations(obj, input.allocations, user)
        return obj

    @strawberry.mutation
    def delete_seedling_purchase(self, info: strawberry.Info, purchase_id: strawberry.ID) -> bool:
        user = require_auth(info)
        obj = SeedlingPurchase.objects.get(id=purchase_id)
        _require_purchase_access(obj, user)
        obj.delete()
        return True

    @strawberry.mutation
    def delete_seedling_purchase_allocation(
        self, info: strawberry.Info, allocation_id: strawberry.ID
    ) -> bool:
        user = require_auth(info)
        allocation = SeedlingPurchaseAllocation.objects.select_related("purchase").get(
            id=allocation_id
        )
        _farm_editor(allocation.farm, user)
        purchase = allocation.purchase
        allocation.delete()
        if not purchase.allocations.exists():
            purchase.delete()
        return True

    # ── Soil inputs (global catalog) ─────────────────────────────────────────
    @strawberry.mutation
    def create_soil_input(
        self, info: strawberry.Info, input: SoilInputCatalogInput
    ) -> SoilInputType:
        require_auth(info)
        return SoilInput.objects.create(**vars(input))

    @strawberry.mutation
    def update_soil_input(
        self, info: strawberry.Info, soil_input_id: strawberry.ID, input: SoilInputCatalogInput
    ) -> SoilInputType:
        user = require_auth(info)
        _require_catalog_editor(user)
        obj = SoilInput.objects.get(id=soil_input_id)
        for field, value in vars(input).items():
            if field == "image":
                continue
            setattr(obj, field, value)
        if input.image is not None:
            obj.image = input.image
        obj.save()
        return obj

    @strawberry.mutation
    def delete_soil_input(self, info: strawberry.Info, soil_input_id: strawberry.ID) -> bool:
        user = require_auth(info)
        _require_catalog_editor(user)
        SoilInput.objects.get(id=soil_input_id).delete()
        return True

    @strawberry.mutation
    def record_soil_treatment(
        self, info: strawberry.Info, input: SoilTreatmentInput
    ) -> SoilTreatmentType:
        user = require_auth(info)
        with transaction.atomic():
            soil_input = SoilInput.objects.get(id=input.soil_input_id)
            obj = SoilTreatment.objects.create(
                soil_input=soil_input,
                date_applied=input.date_applied,
                quantity=input.quantity,
                unit=input.unit,
                area_covered_acres=input.area_covered_acres,
                unit_cost=input.unit_cost,
                content_amount=input.content_amount,
                content_unit=input.content_unit,
                supplier=_resolve_supplier(input.supplier_id),
                notes=input.notes,
            )
            _set_soil_treatment_allocations(obj, input.allocations, user)
        return obj

    @strawberry.mutation
    def update_soil_treatment(
        self, info: strawberry.Info, treatment_id: strawberry.ID, input: SoilTreatmentInput
    ) -> SoilTreatmentType:
        user = require_auth(info)
        with transaction.atomic():
            obj = SoilTreatment.objects.get(id=treatment_id)
            _require_purchase_access(obj, user)
            obj.soil_input = SoilInput.objects.get(id=input.soil_input_id)
            obj.date_applied = input.date_applied
            obj.quantity = input.quantity
            obj.unit = input.unit
            obj.area_covered_acres = input.area_covered_acres
            obj.unit_cost = input.unit_cost
            obj.content_amount = input.content_amount
            obj.content_unit = input.content_unit
            obj.supplier = _resolve_supplier(input.supplier_id)
            obj.notes = input.notes
            obj.save()
            _set_soil_treatment_allocations(obj, input.allocations, user)
        return obj

    @strawberry.mutation
    def delete_soil_treatment(self, info: strawberry.Info, treatment_id: strawberry.ID) -> bool:
        user = require_auth(info)
        obj = SoilTreatment.objects.get(id=treatment_id)
        _require_purchase_access(obj, user)
        obj.delete()
        return True

    @strawberry.mutation
    def delete_soil_treatment_allocation(
        self, info: strawberry.Info, allocation_id: strawberry.ID
    ) -> bool:
        user = require_auth(info)
        allocation = SoilTreatmentAllocation.objects.select_related("purchase").get(
            id=allocation_id
        )
        _farm_editor(allocation.farm, user)
        purchase = allocation.purchase
        allocation.delete()
        if not purchase.allocations.exists():
            purchase.delete()
        return True

    @strawberry.mutation
    def record_soil_input_purchase(
        self, info: strawberry.Info, input: SoilInputPurchaseInput
    ) -> SoilInputPurchaseType:
        user = require_auth(info)
        with transaction.atomic():
            soil_input = SoilInput.objects.get(id=input.soil_input_id)
            obj = SoilInputPurchase.objects.create(
                soil_input=soil_input,
                purchase_date=input.purchase_date,
                quantity=input.quantity,
                unit=input.unit,
                unit_cost=input.unit_cost,
                content_amount=input.content_amount,
                content_unit=input.content_unit,
                supplier=_resolve_supplier(input.supplier_id),
                notes=input.notes,
            )
            _set_soil_input_purchase_allocations(obj, input.allocations, user)
        return obj

    @strawberry.mutation
    def update_soil_input_purchase(
        self, info: strawberry.Info, purchase_id: strawberry.ID, input: SoilInputPurchaseInput
    ) -> SoilInputPurchaseType:
        user = require_auth(info)
        with transaction.atomic():
            obj = SoilInputPurchase.objects.get(id=purchase_id)
            _require_purchase_access(obj, user)
            obj.soil_input = SoilInput.objects.get(id=input.soil_input_id)
            obj.purchase_date = input.purchase_date
            obj.quantity = input.quantity
            obj.unit = input.unit
            obj.unit_cost = input.unit_cost
            obj.content_amount = input.content_amount
            obj.content_unit = input.content_unit
            obj.supplier = _resolve_supplier(input.supplier_id)
            obj.notes = input.notes
            obj.save()
            _set_soil_input_purchase_allocations(obj, input.allocations, user)
        return obj

    @strawberry.mutation
    def delete_soil_input_purchase(self, info: strawberry.Info, purchase_id: strawberry.ID) -> bool:
        user = require_auth(info)
        obj = SoilInputPurchase.objects.get(id=purchase_id)
        _require_purchase_access(obj, user)
        obj.delete()
        return True

    @strawberry.mutation
    def delete_soil_input_purchase_allocation(
        self, info: strawberry.Info, allocation_id: strawberry.ID
    ) -> bool:
        user = require_auth(info)
        allocation = SoilInputPurchaseAllocation.objects.select_related("purchase").get(
            id=allocation_id
        )
        _farm_editor(allocation.farm, user)
        purchase = allocation.purchase
        allocation.delete()
        if not purchase.allocations.exists():
            purchase.delete()
        return True

    # ── Fence ─────────────────────────────────────────────────────────────────
    @strawberry.mutation
    def report_fence_damage(
        self, info: strawberry.Info, input: FenceDamageInput
    ) -> FenceDamageType:
        user = require_auth(info)
        farm = Farm.objects.get(id=input.farm_id)
        _farm_member(farm, user)
        return FenceDamage.objects.create(
            farm=farm,
            location_description=input.location_description,
            damage_type=input.damage_type,
            date_reported=input.date_reported,
            severity=input.severity,
            notes=input.notes,
            image=input.image,
        )

    @strawberry.mutation
    def update_fence_damage(
        self, info: strawberry.Info, damage_id: strawberry.ID, input: FenceDamageInput
    ) -> FenceDamageType:
        user = require_auth(info)
        obj = FenceDamage.objects.get(id=damage_id)
        _farm_editor(obj.farm, user)
        obj.location_description = input.location_description
        obj.damage_type = input.damage_type
        obj.date_reported = input.date_reported
        obj.severity = input.severity
        obj.notes = input.notes
        if input.image is not None:
            obj.image = input.image
        obj.save()
        return obj

    @strawberry.mutation
    def delete_fence_damage(self, info: strawberry.Info, damage_id: strawberry.ID) -> bool:
        user = require_auth(info)
        obj = FenceDamage.objects.get(id=damage_id)
        _farm_editor(obj.farm, user)
        obj.delete()
        return True

    @strawberry.mutation
    def update_fence_repair(
        self, info: strawberry.Info, damage_id: strawberry.ID, input: FenceRepairInput
    ) -> FenceDamageType:
        user = require_auth(info)
        obj = FenceDamage.objects.get(id=damage_id)
        _farm_editor(obj.farm, user)
        obj.repair_status = input.repair_status
        if input.repair_cost is not None:
            obj.repair_cost = input.repair_cost
        if input.date_repaired is not None:
            obj.date_repaired = input.date_repaired
        if input.notes:
            obj.notes = input.notes
        obj.save()
        return obj
