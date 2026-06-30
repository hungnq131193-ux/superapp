import mimetypes, shutil, uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from .config import Settings

ALLOWED_EXT = {'.jpg','.jpeg','.png','.webp','.pdf'}
ALLOWED_MIME = {'image/jpeg','image/png','image/webp','application/pdf'}

def safe_ext(filename: str) -> str:
    ext = Path(filename or '').suffix.lower()
    if ext not in ALLOWED_EXT: raise HTTPException(400, 'Unsupported file extension')
    return ext

def check_mime(file: UploadFile) -> str:
    mime = file.content_type or mimetypes.guess_type(file.filename or '')[0] or 'application/octet-stream'
    if mime not in ALLOWED_MIME: raise HTTPException(400, 'Unsupported MIME type')
    return mime

async def save_upload(file: UploadFile, settings: Settings) -> tuple[Path, str]:
    ext = safe_ext(file.filename or 'upload'); mime = check_mime(file)
    dest = settings.temp_path / f'{uuid.uuid4().hex}{ext}'
    size = 0
    try:
        with dest.open('wb') as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_file_size_bytes: raise HTTPException(413, f'File too large. Max {settings.MAX_FILE_SIZE_MB} MB')
                out.write(chunk)
        return dest, mime
    except Exception:
        dest.unlink(missing_ok=True); raise

def remove_path(path: Path | None) -> None:
    if not path: return
    try:
        if path.is_dir(): shutil.rmtree(path, ignore_errors=True)
        else: path.unlink(missing_ok=True)
    except FileNotFoundError: pass
