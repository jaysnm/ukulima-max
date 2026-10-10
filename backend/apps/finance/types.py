from datetime import date
from decimal import Decimal
from typing import Optional

import strawberry
import strawberry_django

from .models import OperationalCost


@strawberry_django.type(
    OperationalCost,
    fields=[
        "id",
        "category",
        "description",
        "quantity",
        "unit_cost",
        "amount",
        "date_incurred",
        "payee",
        "notes",
        "created_at",
    ],
)
class OperationalCostType:
    pass


@strawberry.input
class OperationalCostInput:
    farm_id: strawberry.ID
    category: str
    description: str
    date_incurred: date
    # Either supply quantity + unit_cost (amount is computed from them) or
    # supply amount directly for a flat, one-off cost.
    quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    payee: str = ""
    notes: str = ""


@strawberry.input
class OperationalCostUpdateInput:
    category: str
    description: str
    date_incurred: date
    quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    payee: str = ""
    notes: str = ""
