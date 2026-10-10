import strawberry
import strawberry_django
from django.contrib.auth.models import User

from .models import Farm, FarmMember, Supplier


@strawberry_django.type(
    User,
    fields=["id", "username", "email", "first_name", "last_name", "is_staff", "is_superuser"],
)
class UserType:
    pass


@strawberry_django.type(
    Supplier,
    fields=["id", "name", "phone", "location", "notes", "product_url"],
)
class SupplierType:
    pass


@strawberry_django.type(FarmMember, fields=["id", "role", "joined_at"])
class FarmMemberType:
    user: UserType


@strawberry_django.type(
    Farm,
    fields=[
        "id",
        "name",
        "location",
        "size_acres",
        "description",
        "is_active",
        "is_default",
        "created_at",
    ],
)
class FarmType:
    members: list[FarmMemberType]


@strawberry.type
class AuthPayload:
    access: str
    refresh: str
    user: UserType


@strawberry.input
class RegisterInput:
    username: str
    email: str
    password: str
    first_name: str = ""
    last_name: str = ""


@strawberry.input
class FarmInput:
    name: str
    location: str
    size_acres: float | None = None
    description: str = ""


@strawberry.input
class InviteMemberInput:
    farm_id: strawberry.ID
    username: str
    role: str = "WORKER"


@strawberry.input
class SupplierInput:
    name: str
    phone: str = ""
    location: str = ""
    notes: str = ""
    product_url: str = ""
