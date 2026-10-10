"""Root Strawberry GraphQL schema for Ukulima Max."""

import strawberry
from strawberry.django.context import StrawberryDjangoContext
from strawberry.django.views import GraphQLView

from apps.accounts.mutations import AccountMutation
from apps.accounts.queries import AccountQuery
from apps.crops.mutations import CropMutation
from apps.crops.queries import CropQuery
from apps.finance.mutations import FinanceMutation
from apps.finance.queries import FinanceQuery
from apps.inputs.mutations import InputMutation
from apps.inputs.queries import InputQuery
from apps.livestock.mutations import LivestockMutation
from apps.livestock.queries import LivestockQuery
from apps.utils import get_user_from_request


@strawberry.type
class Query(AccountQuery, CropQuery, LivestockQuery, InputQuery, FinanceQuery):
    pass


@strawberry.type
class Mutation(AccountMutation, CropMutation, LivestockMutation, InputMutation, FinanceMutation):
    pass


schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
)


class AuthenticatedGraphQLView(GraphQLView):
    """GraphQLView that authenticates requests via JWT instead of Django sessions."""

    def get_context(self, request, response):
        request.user = get_user_from_request(request)
        return StrawberryDjangoContext(request=request, response=response)
