import os
import uuid

from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {
    "png", "jpg", "jpeg", "gif", "webp",
    "pdf", "xlsx", "xls", "csv", "docx", "doc", "txt", "zip",
    "mp4", "mov",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def _ext(filename: str) -> str:
    parts = filename.rsplit(".", 1)
    return parts[-1].lower() if len(parts) == 2 else ""


def get_s3_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("S3_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
        region_name=os.getenv("S3_REGION", "auto"),
    )


def _upload_local(file_obj, original_filename: str, user_id: int) -> dict:
    """Fallback: save to backend/uploads/ and serve via /uploads/<path>."""
    ext = _ext(original_filename)
    unique_name = f"{uuid.uuid4()}.{ext}"
    rel_path = os.path.join(str(user_id), unique_name)

    upload_root = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "uploads",
    )
    dest_dir = os.path.join(upload_root, str(user_id))
    os.makedirs(dest_dir, exist_ok=True)

    dest_path = os.path.join(dest_dir, unique_name)
    file_obj.save(dest_path)
    size = os.path.getsize(dest_path)

    return {
        "url": f"/uploads/{rel_path}",
        "filename": secure_filename(original_filename),
        "size": size,
        "mime_type": file_obj.content_type or "application/octet-stream",
    }


def upload_file(file_obj, original_filename: str, user_id: int) -> dict:
    """Upload a file and return metadata dict.

    Returns:
        {"url": ..., "filename": ..., "size": ..., "mime_type": ...}

    Raises:
        ValueError: unsupported extension or file too large.
    """
    ext = _ext(original_filename)
    if not ext or ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: .{ext}")

    # Size check (content_length may be None for streaming uploads; checked by caller too)
    content_length = getattr(file_obj, "content_length", None)
    if content_length and content_length > MAX_FILE_SIZE:
        raise ValueError("File exceeds 50 MB limit")

    endpoint_url = os.getenv("S3_ENDPOINT_URL")
    if not endpoint_url:
        # Development fallback: local filesystem
        return _upload_local(file_obj, original_filename, user_id)

    key = f"uploads/{user_id}/{uuid.uuid4()}.{ext}"
    s3 = get_s3_client()
    bucket = os.getenv("S3_BUCKET", "tascal-uploads")

    s3.upload_fileobj(
        file_obj,
        bucket,
        key,
        ExtraArgs={"ContentType": file_obj.content_type or "application/octet-stream"},
    )

    base_url = os.getenv("S3_PUBLIC_URL", f"https://{bucket}.s3.amazonaws.com")
    return {
        "url": f"{base_url}/{key}",
        "filename": secure_filename(original_filename),
        "size": content_length or 0,
        "mime_type": file_obj.content_type or "application/octet-stream",
    }
