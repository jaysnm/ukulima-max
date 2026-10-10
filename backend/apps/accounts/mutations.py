import strawberry
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken

from ..utils import require_auth
from .models import Farm, FarmMember, Supplier, is_worker_only
from .types import (
    AuthPayload,
    FarmInput,
    FarmMemberType,
    FarmType,
    InviteMemberInput,
    RegisterInput,
    SupplierInput,
    SupplierType,
)


@strawberry.type
class AccountMutation:
    @strawberry.mutation
    def register(self, info: strawberry.Info, input: RegisterInput) -> AuthPayload:
        if User.objects.filter(username=input.username).exists():
            raise ValueError("Username already taken")
        user = User.objects.create_user(
            username=input.username,
            email=input.email,
            password=input.password,
            first_name=input.first_name,
            last_name=input.last_name,
        )
        refresh = RefreshToken.for_user(user)
        return AuthPayload(
            access=str(refresh.access_token),
            refresh=str(refresh),
            user=user,
        )

    @strawberry.mutation
    def login(self, info: strawberry.Info, username: str, password: str) -> AuthPayload:
        user = authenticate(username=username, password=password)
        if not user:
            raise ValueError("Invalid credentials")
        refresh = RefreshToken.for_user(user)
        return AuthPayload(
            access=str(refresh.access_token),
            refresh=str(refresh),
            user=user,
        )

    @strawberry.mutation
    def refresh_token(self, info: strawberry.Info, refresh: str) -> str:
        token = RefreshToken(refresh)
        return str(token.access_token)

    @strawberry.mutation
    def create_farm(self, info: strawberry.Info, input: FarmInput) -> FarmType:
        user = require_auth(info)
        if is_worker_only(user):
            raise PermissionError("Workers cannot create farms")
        is_first_farm = not Farm.objects.filter(owner=user).exists()
        farm = Farm.objects.create(owner=user, is_default=is_first_farm, **vars(input))
        FarmMember.objects.create(farm=farm, user=user, role=FarmMember.Role.OWNER)
        return farm

    @strawberry.mutation
    def update_farm(
        self, info: strawberry.Info, farm_id: strawberry.ID, input: FarmInput
    ) -> FarmType:
        user = require_auth(info)
        farm = Farm.objects.get(id=farm_id)
        _check_farm_role(farm, user, [FarmMember.Role.OWNER, FarmMember.Role.MANAGER])
        for field, value in vars(input).items():
            if value is not None:
                setattr(farm, field, value)
        farm.save()
        return farm

    @strawberry.mutation
    def delete_farm(self, info: strawberry.Info, farm_id: strawberry.ID) -> bool:
        user = require_auth(info)
        farm = Farm.objects.get(id=farm_id)
        _check_farm_role(farm, user, [FarmMember.Role.OWNER])
        farm.delete()
        return True

    @strawberry.mutation
    def set_farm_active(
        self, info: strawberry.Info, farm_id: strawberry.ID, is_active: bool
    ) -> FarmType:
        user = require_auth(info)
        farm = Farm.objects.get(id=farm_id)
        _check_farm_role(farm, user, [FarmMember.Role.OWNER, FarmMember.Role.MANAGER])
        farm.is_active = is_active
        farm.save(update_fields=["is_active", "updated_at"])
        return farm

    @strawberry.mutation
    def set_farm_default(self, info: strawberry.Info, farm_id: strawberry.ID) -> FarmType:
        user = require_auth(info)
        farm = Farm.objects.get(id=farm_id)
        _check_farm_role(farm, user, [FarmMember.Role.OWNER, FarmMember.Role.MANAGER])
        with transaction.atomic():
            Farm.objects.filter(owner=farm.owner, is_default=True).exclude(pk=farm.pk).update(
                is_default=False
            )
            farm.is_default = True
            farm.save(update_fields=["is_default", "updated_at"])
        return farm

    @strawberry.mutation
    def invite_member(self, info: strawberry.Info, input: InviteMemberInput) -> FarmMemberType:
        user = require_auth(info)
        farm = Farm.objects.get(id=input.farm_id)
        _check_farm_role(farm, user, [FarmMember.Role.OWNER, FarmMember.Role.MANAGER])
        target = User.objects.get(username=input.username)
        member, _ = FarmMember.objects.get_or_create(
            farm=farm, user=target, defaults={"role": input.role}
        )
        return member

    @strawberry.mutation
    def update_member_role(
        self, info: strawberry.Info, farm_id: strawberry.ID, user_id: strawberry.ID, role: str
    ) -> FarmMemberType:
        user = require_auth(info)
        farm = Farm.objects.get(id=farm_id)
        _check_farm_role(farm, user, [FarmMember.Role.OWNER])
        member = FarmMember.objects.get(farm=farm, user_id=user_id)
        member.role = role
        member.save()
        return member

    @strawberry.mutation
    def remove_member(
        self, info: strawberry.Info, farm_id: strawberry.ID, user_id: strawberry.ID
    ) -> bool:
        user = require_auth(info)
        farm = Farm.objects.get(id=farm_id)
        _check_farm_role(farm, user, [FarmMember.Role.OWNER])
        FarmMember.objects.filter(farm=farm, user_id=user_id).delete()
        return True

    # ── Suppliers (global directory) ──────────────────────────────────────
    @strawberry.mutation
    def create_supplier(self, info: strawberry.Info, input: SupplierInput) -> SupplierType:
        require_auth(info)
        return Supplier.objects.create(**vars(input))

    @strawberry.mutation
    def update_supplier(
        self, info: strawberry.Info, supplier_id: strawberry.ID, input: SupplierInput
    ) -> SupplierType:
        user = require_auth(info)
        _require_editor(user)
        supplier = Supplier.objects.get(id=supplier_id)
        for field, value in vars(input).items():
            setattr(supplier, field, value)
        supplier.save()
        return supplier

    @strawberry.mutation
    def delete_supplier(self, info: strawberry.Info, supplier_id: strawberry.ID) -> bool:
        user = require_auth(info)
        _require_editor(user)
        Supplier.objects.get(id=supplier_id).delete()
        return True


def _check_farm_role(farm, user, allowed_roles):
    if user.is_staff or user.is_superuser:
        return
    if not FarmMember.objects.filter(farm=farm, user=user, role__in=allowed_roles).exists():
        raise PermissionError("Insufficient permissions for this farm")


def _require_editor(user):
    """Global catalogs (suppliers, crops, pesticides, …) have no farm of
    their own, so editing/deleting them can't be checked per-farm — a
    worker-only user (no OWNER/MANAGER role on any farm) may still create
    new catalog entries, just not modify or remove existing ones.
    """
    if is_worker_only(user):
        raise PermissionError("Workers can create records but cannot edit or delete them")
