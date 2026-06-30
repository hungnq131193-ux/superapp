import time, uuid
from threading import Lock
from pathlib import Path
from .schemas import JobInfo, OCRResult
from .file_service import remove_path

class JobStore:
    def __init__(self, ttl: int):
        self.ttl=ttl; self._jobs={}; self._results={}; self._files={}; self._lock=Lock()
    def create(self, filename: str, path: Path) -> str:
        job_id=uuid.uuid4().hex; now=time.time()
        with self._lock:
            self._jobs[job_id]=JobInfo(job_id=job_id,status='queued',filename=filename,created_at=now,expires_at=now+self.ttl)
            self._files[job_id]=path
        return job_id
    def set_status(self, job_id: str, status, error=None, progress=0):
        with self._lock:
            j=self._jobs[job_id]; self._jobs[job_id]=j.model_copy(update={'status':status,'error':error,'progress':progress,'expires_at':time.time()+self.ttl})
    def set_result(self, job_id: str, result: OCRResult):
        with self._lock: self._results[job_id]=result
        self.set_status(job_id,'done',progress=100)
    def get(self, job_id):
        self.cleanup();
        if job_id not in self._jobs: raise KeyError(job_id)
        return self._jobs[job_id]
    def result(self, job_id):
        self.cleanup()
        if job_id not in self._results: raise KeyError(job_id)
        return self._results[job_id]
    def delete(self, job_id):
        with self._lock:
            remove_path(self._files.pop(job_id, None)); self._jobs.pop(job_id, None); self._results.pop(job_id, None)
    def cleanup(self):
        now=time.time()
        for jid,j in list(self._jobs.items()):
            if j.expires_at < now: self.delete(jid)
