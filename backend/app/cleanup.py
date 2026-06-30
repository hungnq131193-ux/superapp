import asyncio
from .job_store import JobStore
async def cleanup_loop(store: JobStore, interval: int = 30):
    while True:
        store.cleanup(); await asyncio.sleep(interval)
