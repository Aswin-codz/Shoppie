from rest_framework.permissions import BasePermission


class IsUser(BasePermission):
    """Allows access only to active users with the USER role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == "USER"
        )


class IsMerchant(BasePermission):
    """Allows access only to active and approved users with the MERCHANT role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and getattr(request.user, "is_approved", True)
            and request.user.role == "MERCHANT"
        )


class IsOwner(BasePermission):
    """
    Object-level permission: allows access only if the object's
    owner matches the requesting user. Prevents None == None bypass.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
        )

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False
        owner = self.get_owner(obj)
        if owner is None:
            return False
        return owner == request.user

    def get_owner(self, obj):
        return getattr(obj, "user", None)


class IsMerchantOwner(BasePermission):
    """
    Object-level permission for merchant-owned resources.
    Requires MERCHANT role, active status, approval, AND ownership.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and getattr(request.user, "is_approved", True)
            and request.user.role == "MERCHANT"
        )

    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False
        merchant = getattr(obj, "merchant", None)
        if merchant is None:
            return False
        return merchant == request.user
