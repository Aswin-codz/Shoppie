from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.core.cache import cache

class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        check_type = request.query_params.get('type', 'liveness')
        
        if check_type == 'liveness':
            return Response({"status": "ok", "service": "shopzy-api"})
            
        # Readiness check
        db_status = "ok"
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            db_status = "error"
            
        cache_status = "ok"
        try:
            cache.set('health_check', 'ok', timeout=1)
            if cache.get('health_check') != 'ok':
                cache_status = "error"
        except Exception:
            cache_status = "error"

        is_ready = db_status == "ok" and cache_status == "ok"
        
        return Response({
            "status": "ok" if is_ready else "error",
            "service": "shopzy-api",
            "database": db_status,
            "cache": cache_status
        }, status=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE)
