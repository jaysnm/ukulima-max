from typing import Optional

import strawberry
from django.contrib.auth.models import User

from ..utils import require_admin, require_auth
from .models import Farm, FarmMember, Supplier
from .types import FarmType, SupplierType, UserType


@strawberry.type
class AccountQuery:
    @strawberry.field
    def me(self, info: strawberry.Info) -> UserType:
        return require_auth(info)

    @strawberry.field
    def my_farms(self, info: strawberry.Info) -> list[FarmType]:
        user = require_auth(info)
        farm_ids = FarmMember.objects.filter(user=user).values_list("farm_id", flat=True)
        return Farm.objects.filter(id__in=farm_ids)

    @strawberry.field
    def farm(self, info: strawberry.Info, farm_id: strawberry.ID) -> Optional[FarmType]:
        user = require_auth(info)
        farm = Farm.objects.filter(id=farm_id).first()
        if not farm:
            return None
        if not FarmMember.objects.filter(farm=farm, user=user).exists():
            raise PermissionError("Not a member of this farm")
        return farm

    @strawberry.field
    def suppliers(self, info: strawberry.Info) -> list[SupplierType]:
        require_auth(info)
        return Supplier.objects.all()

    # ── Admin: cross-farm user/role management ────────────────────────────
    @strawberry.field
    def all_users(self, info: strawberry.Info) -> list[UserType]:
        require_admin(info)
        return User.objects.all().order_by("username")

    @strawberry.field
    def all_farms(self, info: strawberry.Info) -> list[FarmType]:
        require_admin(info)
        return Farm.objects.all()
