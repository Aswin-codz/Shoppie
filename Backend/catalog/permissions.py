from rest_framework import permissions


class IsMerchantOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow merchant owners of an object to edit it.
    Assumes the model instance has an `merchant` attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Instance must have an attribute named `merchant`.
        # Check that user is authenticated and is the owner.
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_active and
            hasattr(obj, 'merchant') and 
            obj.merchant is not None and
            obj.merchant == request.user
        )
