import uuid
from django.contrib.auth.models import BaseUserManager


class CustomUserManager(BaseUserManager):
    """
    Custom manager for User model where email is the unique identifier
    for authentication instead of username.
    """

    def normalize_email(self, email):
        """Lowercase the full email address consistently."""
        email = super().normalize_email(email)
        return email.lower() if email else email

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        # Use a unique UUID-based username to guarantee no collisions across domains
        if not extra_fields.get("username"):
            extra_fields["username"] = uuid.uuid4().hex
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)
