from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    USE_GPU: bool = False
    DEVICE: str = 'cpu'
    OCR_MODE: str = 'structure'
    OCR_LANG: str = 'vi_en'
    MAX_FILE_SIZE_MB: int = 25
    DELETE_FILE_AFTER_PROCESS: bool = True
    TEMP_DIR: str = '/tmp/paddleocr-web'
    OCR_JOB_TTL_SECONDS: int = 300
    ALLOWED_ORIGINS: str = '*'

    @property
    def max_file_size_bytes(self) -> int: return self.MAX_FILE_SIZE_MB * 1024 * 1024
    @property
    def effective_device(self) -> str:
        return 'gpu' if self.USE_GPU and self.DEVICE.lower().startswith('gpu') else 'cpu'
    @property
    def temp_path(self) -> Path:
        p = Path(self.TEMP_DIR); p.mkdir(parents=True, exist_ok=True); return p

@lru_cache
def get_settings() -> Settings: return Settings()
