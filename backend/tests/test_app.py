from pathlib import Path
from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.config import Settings
from app.file_service import remove_path
from app.ocr_service import OCRService

client=TestClient(app)

def test_health():
    r=client.get('/health'); assert r.status_code==200; assert r.json()['status']=='ok'

def test_reject_bad_extension():
    r=client.post('/api/ocr', files={'file':('bad.exe', b'x', 'application/octet-stream')})
    assert r.status_code==400

def test_reject_too_large(monkeypatch):
    from app.main import settings
    monkeypatch.setattr(settings, 'MAX_FILE_SIZE_MB', 0)
    r=client.post('/api/ocr', files={'file':('a.png', b'abc', 'image/png')})
    assert r.status_code==413

def test_cleanup_temp_file(tmp_path):
    p=tmp_path/'x.tmp'; p.write_text('x'); remove_path(p); assert not p.exists()

def test_ocr_service_mock(monkeypatch, tmp_path):
    s=Settings(TEMP_DIR=str(tmp_path), OCR_MODE='simple')
    svc=OCRService(s)
    class Fake:
        def predict(self, path): return [[[[0,0],[1,0],[1,1],[0,1]], ['hello', 0.9]]]
    monkeypatch.setattr(svc, '_get_simple', lambda: Fake())
    img=tmp_path/'a.png'; img.write_bytes(b'x')
    res=svc.process('job', img, 'image/png', 'a.png')
    assert 'hello' in res.text; assert not img.exists()
