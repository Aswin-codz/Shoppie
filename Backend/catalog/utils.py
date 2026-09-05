import logging
import cloudinary
import cloudinary.uploader
import cloudinary.api
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
MAX_IMAGE_SIZE_MB = 10
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024


def validate_image_file(file_obj):
    """
    Validates that the file is an image and under the maximum size.
    """
    if not file_obj:
        raise ValidationError("No file provided.")

    if file_obj.size > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(f"Image file too large. Maximum size is {MAX_IMAGE_SIZE_MB}MB.")

    if file_obj.content_type not in ALLOWED_IMAGE_TYPES:
        raise ValidationError(f"Unsupported file type. Allowed types are: {', '.join(ALLOWED_IMAGE_TYPES)}")


def upload_to_cloudinary(file_obj, folder_path):
    """
    Uploads an image file to Cloudinary safely.
    Returns the response dictionary from Cloudinary.
    """
    validate_image_file(file_obj)

    try:
        response = cloudinary.uploader.upload(
            file_obj,
            folder=folder_path,
            resource_type="image",
            overwrite=True,
            format="auto",
            quality="auto",
            responsive_breakpoints=[{
                "create_derived": True,
                "bytes_step": 20000,
                "min_width": 200,
                "max_width": 1000,
                "max_images": 5
            }]
        )
        return response
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {str(e)}")
        raise ValidationError("Failed to upload image to media server.")


def delete_from_cloudinary(public_id):
    """
    Deletes an asset from Cloudinary using its public_id.
    """
    if not public_id:
        return

    try:
        cloudinary.uploader.destroy(public_id, invalidate=True)
    except Exception as e:
        # We log the error but don't fail the request, as the DB deletion is primary
        # and we don't want to block merchants from deleting a product if the remote
        # asset is already gone or errors out.
        logger.error(f"Failed to delete Cloudinary asset {public_id}: {str(e)}")
