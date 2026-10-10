from django.contrib.auth.models import AnonymousUser, User
from django.db import models
from rest_framework_simplejwt.tokens import AccessToken


class CatalogItem(models.Model):
    """Shared shape for reusable, farm-independent reference entries — crop
    types, pesticides, vet drugs, feeds, seedlings, soil inputs. Naming these
    once here (instead of duplicating a free-text string per record) means
    fixing a typo in one place corrects it everywhere the entry is used.

    Deliberately no `supplier` here: the same catalog entry (e.g. a seedling
    or pesticide) can be bought from different suppliers at different prices
    over time, so supplier belongs on the purchase/application record, not
    the reusable catalog entry it refers to.
    """

    name = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    product_url = models.URLField(blank=True, help_text="Link to the product page, if any")

    class Meta:
        abstract = True
        ordering = ["name"]

    def __str__(self):
        return self.name


class WithPhoto(models.Model):
    """Optional supporting photo — e.g. a livestock head-count during a
    stock take, or evidence of an applied input / reported damage.
    """

    image = models.ImageField(upload_to="uploads/%Y/%m/", null=True, blank=True)

    class Meta:
        abstract = True

    @property
    def image_url(self):
        return self.image.url if self.image else None


def get_user_from_request(request) -> User | AnonymousUser:
    """Extract and validate JWT from Authorization header."""
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return AnonymousUser()
    token_str = auth_header.split(" ", 1)[1]
    try:
        token = AccessToken(token_str)
        return User.objects.get(id=token["user_id"])
    except Exception:
        return AnonymousUser()


def require_auth(info) -> User:
    user = info.context.request.user
    if not user or not user.is_authenticated:
        raise PermissionError("Authentication required")
    return user


def require_admin(info) -> User:
    user = require_auth(info)
    if not (user.is_staff or user.is_superuser):
        raise PermissionError("Admin privileges required")
    return user
