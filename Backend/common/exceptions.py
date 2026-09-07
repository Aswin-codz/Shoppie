import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('shopzy')

def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django Rest Framework.
    Logs exceptions and formats responses properly.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Log the exception
    if response is not None:
        if response.status_code >= 500:
            logger.error(f"Server Error: {exc}", exc_info=True)
        else:
            logger.warning(f"Client Error ({response.status_code}): {exc}")
    else:
        # If response is None, it's an unhandled exception (like a 500)
        logger.error(f"Unhandled Exception: {exc}", exc_info=True)
        
        # We can construct a response so it doesn't just crash out returning HTML
        response = Response(
            {"detail": "A server error occurred. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Standardize the response payload
    if response is not None:
        data = response.data if hasattr(response, 'data') else {}
        if not isinstance(data, dict):
            data = {"detail": data}
            
        custom_data = {
            "success": False,
            "error_code": response.status_code,
            "message": "An error occurred",
            "details": dict(data)
        }
        
        if "detail" in data:
            detail = data["detail"]
            if isinstance(detail, list) and len(detail) > 0:
                custom_data["message"] = str(detail[0])
            else:
                custom_data["message"] = str(detail)
            if "detail" in custom_data["details"]:
                del custom_data["details"]["detail"]
        elif "non_field_errors" in data:
            errors = data["non_field_errors"]
            if isinstance(errors, list) and len(errors) > 0:
                custom_data["message"] = str(errors[0])
            else:
                custom_data["message"] = str(errors)
            if "non_field_errors" in custom_data["details"]:
                del custom_data["details"]["non_field_errors"]
            
        response.data = custom_data

    return response
