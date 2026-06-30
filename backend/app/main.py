import asyncio, json, logging
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from .config import get_settings
from .file_service import save_upload
from .job_store import JobStore
from .ocr_service import OCRService
from .cleanup import cleanup_loop

logging.basicConfig(level=logging.INFO)
settings=get_settings(); app=FastAPI(title='PaddleOCR Web App')
app.add_middleware(CORSMiddleware, allow_origins=['*'] if settings.ALLOWED_ORIGINS=='*' else settings.ALLOWED_ORIGINS.split(','), allow_methods=['*'], allow_headers=['*'])
store=JobStore(settings.OCR_JOB_TTL_SECONDS); ocr=OCRService(settings)

@app.on_event('startup')
async def startup(): asyncio.create_task(cleanup_loop(store))

@app.get('/health')
def health(): return {'status':'ok','device':settings.effective_device,'ocr_mode':settings.OCR_MODE,'ocr_lang':settings.OCR_LANG}

def run_ocr(job_id, path, mime, filename):
    try:
        store.set_status(job_id,'processing',progress=10)
        store.set_result(job_id, ocr.process(job_id,path,mime,filename))
    except Exception as e:
        logging.exception('OCR failed')
        store.set_status(job_id,'error',error=str(e),progress=100)

@app.post('/api/ocr')
async def create_ocr(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    path,mime=await save_upload(file, settings); job_id=store.create(file.filename or path.name, path)
    background_tasks.add_task(run_ocr, job_id, path, mime, file.filename or path.name)
    return {'job_id':job_id}
@app.get('/api/jobs/{job_id}')
def get_job(job_id: str):
    try: return store.get(job_id)
    except KeyError: raise HTTPException(404,'Job not found')
@app.get('/api/jobs/{job_id}/result')
def get_result(job_id: str):
    try: return store.result(job_id)
    except KeyError: raise HTTPException(404,'Result not ready or job not found')
@app.get('/api/jobs/{job_id}/download')
def download(job_id: str, format: str='txt'):
    try: result=store.result(job_id)
    except KeyError: raise HTTPException(404,'Result not ready or job not found')
    if format=='txt': data=result.text; media='text/plain'; name='ocr.txt'
    elif format=='json': data=json.dumps(result.model_dump(),ensure_ascii=False,indent=2); media='application/json'; name='ocr.json'
    elif format=='md': data=result.markdown or result.text; media='text/markdown'; name='ocr.md'
    else: raise HTTPException(400,'format must be txt, json, or md')
    return Response(data, media_type=media, headers={'Content-Disposition':f'attachment; filename={name}'})
@app.delete('/api/jobs/{job_id}')
def delete_job(job_id: str): store.delete(job_id); return {'ok':True}
