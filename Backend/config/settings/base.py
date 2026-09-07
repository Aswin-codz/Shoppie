import os
from datetime import timedelta
from pathlib import Path
import environ
# BASE_DIR should point to Backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False)
)
environ.Env.read_env(os.path.join(BASE_DIR.parent, '.env'))

SECRET_KEY = env('DJANGO_SECRET_KEY')

# Ensure CLOUDINARY_URL is available in os.environ for Cloudinary
_c_url = env('CLOUDINARY_URL', default=None)
_cloud_name = env('CLOUDINARY_CLOUD_NAME', default=env('CLOUD_NAME', default='doiivfjna'))
_api_key = env('CLOUDINARY_API_KEY', default=env('API_KEY', default='477527466897225'))
_api_secret = env('CLOUDINARY_API_SECRET', default=env('API_SECRET', default='zM4MMz_Kb8guAsAmxnehbR-a4rk'))

if not _c_url and _cloud_name and _api_key and _api_secret:
    _c_url = f"cloudinary://{_api_key}:{_api_secret}@{_cloud_name}"

if _c_url:
    os.environ['CLOUDINARY_URL'] = _c_url

CLOUDINARY = {
    'cloud_name': _cloud_name,
    'api_key': _api_key,
    'api_secret': _api_secret,
    'secure': True,
}

import cloudinary
import cloudinary.uploader
import cloudinary.api

cloudinary.config(
    cloud_name=_cloud_name,
    api_key=_api_key,
    api_secret=_api_secret,
    secure=True
)

# Stripe Configuration
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = env('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET', default='')

ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '.onrender.com', '.vercel.app', '*'])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'django.contrib.postgres',
    'cloudinary',
    'accounts',
    'common',
    'catalog',
    'orders',
    'django_q',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'common.middleware.RequestCorrelationMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': env.db('DATABASE_URL')
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    "DEFAULT_PARSER_CLASSES": (
        'rest_framework.parsers.JSONParser',
    ),
    "DEFAULT_AUTHENTICATION_CLASSES": (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        'rest_framework.permissions.IsAuthenticated',
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    "DEFAULT_THROTTLE_RATES": {
        'anon': '1000/day',
        'user': '10000/day',
        'register': '100/hour',
        'login': '100/hour',
        'checkout': '100/hour'
    },
    "DEFAULT_PAGINATION_CLASS": 'rest_framework.pagination.PageNumberPagination',
    "PAGE_SIZE": 24,
    "EXCEPTION_HANDLER": 'common.exceptions.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
])
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
    r"^https://.*\.onrender\.com$",
]
CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=True)
CORS_ALLOW_CREDENTIALS = True

# Django-Q2 Configuration
Q_CLUSTER = {
    'name': 'nexura',
    'workers': 4,
    'recycle': 500,
    'timeout': 60,
    'compress': True,
    'save_limit': 250,
    'queue_limit': 500,
    'cpu_affinity': 1,
    'label': 'Django Q',
    'orm': 'default',
    'max_attempts': 3,
    'retry': 120,
}
