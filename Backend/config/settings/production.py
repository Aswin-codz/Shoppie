from .base import *

DEBUG = env.bool('DJANGO_DEBUG', default=False)

# Optimize DB connections for production with Neon PostgreSQL
DATABASES['default']['CONN_MAX_AGE'] = 60
DATABASES['default']['CONN_HEALTH_CHECKS'] = True

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True

# Static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'correlation_id': {
            '()': 'common.middleware.CorrelationIdFilter',
        },
    },
    'formatters': {
        'verbose': {
            'format': '{asctime} [{levelname}] [{module}] [cid:{correlation_id}]: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
            'filters': ['correlation_id'],
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': env.str('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'shopzy': {
            'handlers': ['console'],
            'level': env.str('SHOPZY_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}
