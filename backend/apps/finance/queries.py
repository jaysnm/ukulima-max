from datetime import date
from typing import Optional

import strawberry

from apps.accounts.models import Farm, FarmMember
from apps.utils import require_auth

from .models import OperationalCost
from .types import OperationalCostType


def _member_farm(user, farm_id):
    farm = Farm.objects.get(id=farm_id)
    if not FarmMember.objects.filter(farm=farm, user=user).exists():
        raise PermissionError("Not a member of this farm")
    return farm


@strawberry.type
class FinanceQuery:
    @strawberry.field
    def operational_costs(
        self,
        info: strawberry.Info,
        farm_id: strawberry.ID,
        category: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> list[OperationalCostType]:
        user = require_auth(info)
        farm = _member_farm(user, farm_id)
        qs = OperationalCost.objects.filter(farm=farm)
        if category:
            qs = qs.filter(category=category)
        if from_date:
            qs = qs.filter(date_incurred__gte=from_date)
        if to_date:
            qs = qs.filter(date_incurred__lte=to_date)
        return qs
