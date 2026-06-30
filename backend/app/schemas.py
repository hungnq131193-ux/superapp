from typing import Any, Literal
from pydantic import BaseModel

JobStatus = Literal['queued','processing','done','error']
class JobInfo(BaseModel):
    job_id: str; status: JobStatus; filename: str | None = None; error: str | None = None; progress: int = 0; created_at: float; expires_at: float
class OCRBox(BaseModel):
    text: str = ''; box: Any | None = None; confidence: float | None = None
class OCRPage(BaseModel):
    page_number: int; text: str = ''; boxes: list[OCRBox] = []; blocks: list[dict[str, Any]] = []; markdown: str | None = None
class OCRResult(BaseModel):
    job_id: str; filename: str; mime_type: str; pages: list[OCRPage]; text: str; markdown: str | None = None; raw: Any | None = None
