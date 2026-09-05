import uuid
import logging
import contextvars

_correlation_id_ctx_var = contextvars.ContextVar('correlation_id', default='-')

class RequestCorrelationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        correlation_id = request.headers.get('X-Correlation-ID', str(uuid.uuid4()))
        request.correlation_id = correlation_id
        
        _correlation_id_ctx_var.set(correlation_id)

        response = self.get_response(request)
        response['X-Correlation-ID'] = correlation_id
        return response

class CorrelationIdFilter(logging.Filter):
    """
    Injects correlation_id into the log record.
    """
    def filter(self, record):
        record.correlation_id = _correlation_id_ctx_var.get()
        return True
