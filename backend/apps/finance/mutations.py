import strawberry

from apps.accounts.models import Farm, FarmMember
from apps.utils import require_auth

from .models import OperationalCost
from .types import OperationalCostInput, OperationalCostType, OperationalCostUpdateInput


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


def _resolve_amount(quantity, unit_cost, amount):
    if quantity is not None and unit_cost is not None:
        return quantity * unit_cost
    if amount is not None:
        return amount
    raise ValueError("Provide either an amount, or both quantity and unit cost")


@strawberry.type
class FinanceMutation:
    @strawberry.mutation
    def record_operational_cost(
        self, info: strawberry.Info, input: OperationalCostInput
    ) -> OperationalCostType:
        user = require_auth(info)
        farm = Farm.objects.get(id=input.farm_id)
        _farm_member(farm, user)
        return OperationalCost.objects.create(
            farm=farm,
            category=input.category,
            description=input.description,
            quantity=input.quantity,
            unit_cost=input.unit_cost,
            amount=_resolve_amount(input.quantity, input.unit_cost, input.amount),
            date_incurred=input.date_incurred,
            payee=input.payee,
            notes=input.notes,
        )

    @strawberry.mutation
    def update_operational_cost(
        self, info: strawberry.Info, cost_id: strawberry.ID, input: OperationalCostUpdateInput
    ) -> OperationalCostType:
        user = require_auth(info)
        cost = OperationalCost.objects.get(id=cost_id)
        _farm_editor(cost.farm, user)
        cost.category = input.category
        cost.description = input.description
        cost.quantity = input.quantity
        cost.unit_cost = input.unit_cost
        cost.amount = _resolve_amount(input.quantity, input.unit_cost, input.amount)
        cost.date_incurred = input.date_incurred
        cost.payee = input.payee
        cost.notes = input.notes
        cost.save()
        return cost

    @strawberry.mutation
    def delete_operational_cost(self, info: strawberry.Info, cost_id: strawberry.ID) -> bool:
        user = require_auth(info)
        cost = OperationalCost.objects.get(id=cost_id)
        _farm_editor(cost.farm, user)
        cost.delete()
        return True
