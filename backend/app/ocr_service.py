import json, tempfile
from pathlib import Path
from typing import Any
from .config import Settings
from .pdf_service import pdf_to_images
from .file_service import remove_path
from .schemas import OCRPage, OCRBox, OCRResult

class OCRService:
    def __init__(self, settings: Settings):
        self.settings=settings; self._simple=None; self._structure=None
    def _lang(self) -> str | None:
        # PaddleOCR lang is a single documented code. Vietnamese is `vi`; English is `en`.
        return {'vi_en':'vi','vi':'vi','en':'en','ch':'ch'}.get(self.settings.OCR_LANG, self.settings.OCR_LANG)
    def _get_simple(self):
        if self._simple is None:
            from paddleocr import PaddleOCR
            kwargs={'lang': self._lang(), 'device': self.settings.effective_device}
            self._simple = PaddleOCR(**{k:v for k,v in kwargs.items() if v})
        return self._simple
    def _get_structure(self):
        if self._structure is None:
            from paddleocr import PPStructureV3
            kwargs={'device': self.settings.effective_device}
            lang=self._lang()
            if lang: kwargs['lang']=lang
            self._structure=PPStructureV3(**kwargs)
        return self._structure
    def process(self, job_id: str, path: Path, mime: str, filename: str) -> OCRResult:
        pages=[]; raw=[]; markdown_parts=[]
        work_dir=Path(tempfile.mkdtemp(prefix=f'{job_id}-', dir=self.settings.temp_path))
        try:
            inputs = pdf_to_images(path, work_dir) if mime == 'application/pdf' and self.settings.OCR_MODE != 'structure' else [path]
            for i, item in enumerate(inputs, 1):
                page = self._process_one(item, i if mime=='application/pdf' else 1)
                pages.append(page); raw.append(page.model_dump())
                if page.markdown: markdown_parts.append(page.markdown)
                if item != path: item.unlink(missing_ok=True)
            text='\n\n'.join(p.text for p in pages)
            md='\n\n'.join(markdown_parts) if markdown_parts else None
            return OCRResult(job_id=job_id, filename=filename, mime_type=mime, pages=pages, text=text, markdown=md, raw=raw)
        finally:
            remove_path(work_dir)
            if self.settings.DELETE_FILE_AFTER_PROCESS: remove_path(path)
    def _process_one(self, path: Path, page_no: int) -> OCRPage:
        if self.settings.OCR_MODE == 'structure':
            try: return self._structure_page(path, page_no)
            except Exception:
                return self._simple_page(path, page_no)
        return self._simple_page(path, page_no)
    def _structure_page(self, path: Path, page_no: int) -> OCRPage:
        out=list(self._get_structure().predict(input=str(path)))
        blocks=[]; boxes=[]; md=None; texts=[]
        for res in out:
            data = getattr(res, 'json', None) or getattr(res, 'dict', None) or {}
            if callable(data): data=data()
            markdown=getattr(res,'markdown',None)
            if isinstance(markdown, dict): md = markdown.get('markdown_text') or markdown.get('text') or md
            elif isinstance(markdown, str): md = markdown
            blocks.append(_jsonable(data))
            _collect(data, boxes, texts)
        return OCRPage(page_number=page_no, text='\n'.join(texts) or (md or ''), boxes=boxes, blocks=blocks, markdown=md)
    def _simple_page(self, path: Path, page_no: int) -> OCRPage:
        res=self._get_simple().predict(str(path)) if hasattr(self._get_simple(), 'predict') else self._get_simple().ocr(str(path), cls=True)
        boxes=[]; texts=[]; _collect(res, boxes, texts)
        return OCRPage(page_number=page_no, text='\n'.join(texts), boxes=boxes, blocks=[])

def _jsonable(x: Any) -> Any:
    try: json.dumps(x); return x
    except Exception: return str(x)

def _collect(obj: Any, boxes: list[OCRBox], texts: list[str]) -> None:
    if isinstance(obj, dict):
        txt = obj.get('text') or obj.get('rec_text') or obj.get('transcription')
        if isinstance(txt, str) and txt.strip():
            conf = obj.get('confidence') or obj.get('score') or obj.get('rec_score')
            boxes.append(OCRBox(text=txt, box=obj.get('box') or obj.get('bbox') or obj.get('dt_polys'), confidence=float(conf) if isinstance(conf,(int,float)) else None)); texts.append(txt)
        for v in obj.values(): _collect(v, boxes, texts)
    elif isinstance(obj, (list, tuple)):
        if len(obj) >= 2 and isinstance(obj[1], (list, tuple)) and len(obj[1]) >= 2 and isinstance(obj[1][0], str):
            boxes.append(OCRBox(text=obj[1][0], box=obj[0], confidence=float(obj[1][1]) if isinstance(obj[1][1], (int,float)) else None)); texts.append(obj[1][0])
        else:
            for v in obj: _collect(v, boxes, texts)
