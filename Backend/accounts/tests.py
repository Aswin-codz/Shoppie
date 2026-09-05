from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.permissions import IsOwner, IsMerchantOwner, IsUser, IsMerchant
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class MockObject:
    """Mock object for testing permissions."""
    def __init__(self, owner=None, merchant=None):
        if owner is not None:
            self.user = owner
        if merchant is not None:
            self.merchant = merchant


class UserModelSecurityTests(TestCase):
    """Security unit tests for User model and manager."""

    def test_username_collision_prevention(self):
        """CRITICAL-1: Test that same email prefixes across domains do not cause IntegrityError."""
        user1 = User.objects.create_user(email="alex@gmail.com", password="testpass123")
        user2 = User.objects.create_user(email="alex@yahoo.com", password="testpass123")
        self.assertNotEqual(user1.username, user2.username)
        self.assertEqual(user1.email, "alex@gmail.com")
        self.assertEqual(user2.email, "alex@yahoo.com")

    def test_email_full_normalization(self):
        """MEDIUM-1: Test that email local-part and domain-part are fully lowercased."""
        user = User.objects.create_user(email="Alex.Test@DOMAIN.com", password="testpass123")
        self.assertEqual(user.email, "alex.test@domain.com")


class SecurityPermissionTests(TestCase):
    """Security unit tests for permission classes (HIGH-1, LOW-1)."""

    def setUp(self):
        self.active_user = User.objects.create_user(
            email="activeuser@example.com", password="testpass123", role=User.Role.USER
        )
        self.inactive_user = User.objects.create_user(
            email="inactiveuser@example.com", password="testpass123", role=User.Role.USER, is_active=False
        )
        self.active_merchant = User.objects.create_user(
            email="activemerchant@example.com", password="testpass123", role=User.Role.MERCHANT, is_approved=True
        )
        self.unapproved_merchant = User.objects.create_user(
            email="unapprovedmerchant@example.com", password="testpass123", role=User.Role.MERCHANT, is_approved=False
        )

    def test_is_owner_none_equality_protection(self):
        """HIGH-1: Test that IsOwner returns False when owner is None or request.user is unauthenticated."""
        perm = IsOwner()

        # Object without user attribute
        obj_no_owner = MockObject()

        # Unauthenticated request (user is None)
        class DummyRequest:
            user = None

        self.assertFalse(perm.has_object_permission(DummyRequest(), None, obj_no_owner))

        # Authenticated user against object without owner
        class AuthenticatedRequest:
            user = self.active_user

        self.assertFalse(perm.has_object_permission(AuthenticatedRequest(), None, obj_no_owner))

    def test_is_owner_inactive_user_denied(self):
        """HIGH-1: Test that inactive user is denied by IsOwner even if matching owner."""
        perm = IsOwner()
        obj = MockObject(owner=self.inactive_user)

        class InactiveRequest:
            user = self.inactive_user

        self.assertFalse(perm.has_permission(InactiveRequest(), None))
        self.assertFalse(perm.has_object_permission(InactiveRequest(), None, obj))

    def test_is_merchant_unapproved_denied(self):
        """LOW-1: Test that unapproved merchant is denied by IsMerchant."""
        perm = IsMerchant()

        class UnapprovedRequest:
            user = self.unapproved_merchant

        self.assertFalse(perm.has_permission(UnapprovedRequest(), None))

    def test_is_merchant_approved_allowed(self):
        perm = IsMerchant()

        class ApprovedRequest:
            user = self.active_merchant

        self.assertTrue(perm.has_permission(ApprovedRequest(), None))


class TokenRefreshSecurityAPITests(TestCase):
    """HIGH-2: Test that deactivated users cannot refresh tokens."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="tokenrefresh@example.com",
            password="StrongPass123!",
            first_name="Token",
            last_name="Refresh",
        )

    def test_token_refresh_blocked_for_deactivated_user(self):
        refresh = RefreshToken.for_user(self.user)

        # Deactivate user after issuing token
        self.user.is_active = False
        self.user.save()

        response = self.client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": str(refresh)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Because we extract the error into message, detail is no longer in data
        self.assertTrue("disabled" in response.data.get('message', '').lower() or "detail" in response.data.get('details', {}))

    def test_token_refresh_blocked_for_unapproved_merchant(self):
        merchant = User.objects.create_user(
            email="merchantrefresh@example.com",
            password="StrongPass123!",
            role=User.Role.MERCHANT,
            is_approved=False,
        )
        refresh = RefreshToken.for_user(merchant)

        response = self.client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": str(refresh)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RegisterAPITests(TestCase):
    """Tests for the registration endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/v1/auth/register/"

    def test_register_user(self):
        data = {
            "email": "newuser@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "John",
            "last_name": "Doe",
            "role": "USER",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", response.data)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])
        self.assertEqual(response.data["user"]["role"], "USER")

    def test_register_merchant(self):
        data = {
            "email": "merchant@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "Jane",
            "last_name": "Merchant",
            "role": "MERCHANT",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], "MERCHANT")

    def test_register_invalid_role(self):
        data = {
            "email": "hacker@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "Hack",
            "last_name": "Er",
            "role": "ADMIN",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        User.objects.create_user(
            email="existing@example.com", password="testpass123"
        )
        data = {
            "email": "existing@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "Dup",
            "last_name": "User",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        data = {
            "email": "mismatch@example.com",
            "password": "StrongPass123!",
            "password_confirm": "DifferentPass!",
            "first_name": "Mis",
            "last_name": "Match",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_no_password_in_response(self):
        data = {
            "email": "safe@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "Safe",
            "last_name": "User",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertNotIn("password", response.data["user"])


class TokenAPITests(TestCase):
    """Tests for login (token obtain) and refresh."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="login@example.com",
            password="StrongPass123!",
            first_name="Login",
            last_name="User",
        )

    def test_login_success(self):
        response = self.client.post(
            "/api/v1/auth/token/",
            {"email": "login@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_invalid_password(self):
        response = self.client.post(
            "/api/v1/auth/token/",
            {"email": "login@example.com", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        response = self.client.post(
            "/api/v1/auth/token/",
            {"email": "nobody@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        login = self.client.post(
            "/api/v1/auth/token/",
            {"email": "login@example.com", "password": "StrongPass123!"},
            format="json",
        )
        refresh = login.data["refresh"]
        response = self.client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)


class MeAPITests(TestCase):
    """Tests for the /me/ endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="me@example.com",
            password="StrongPass123!",
            first_name="Me",
            last_name="User",
        )

    def test_me_authenticated(self):
        login = self.client.post(
            "/api/v1/auth/token/",
            {"email": "me@example.com", "password": "StrongPass123!"},
            format="json",
        )
        token = login.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "me@example.com")
        self.assertNotIn("password", response.data)

    def test_me_unauthenticated(self):
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutAPITests(TestCase):
    """Tests for the logout endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="logout@example.com",
            password="StrongPass123!",
            first_name="Logout",
            last_name="User",
        )

    def test_logout_success(self):
        login = self.client.post(
            "/api/v1/auth/token/",
            {"email": "logout@example.com", "password": "StrongPass123!"},
            format="json",
        )
        access = login.data["access"]
        refresh = login.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = self.client.post(
            "/api/v1/auth/logout/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The blacklisted refresh token should no longer work.
        # CustomTokenRefreshSerializer wraps blacklisted-token errors as
        # ValidationError (400) rather than the default SimpleJWT 401.
        response = self.client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

