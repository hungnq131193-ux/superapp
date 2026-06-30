const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export async function submitOCR(file){ const fd=new FormData(); fd.append('file',file); const r=await fetch(`${API}/api/ocr`,{method:'POST',body:fd}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
export async function getJob(id){ const r=await fetch(`${API}/api/jobs/${id}`); if(!r.ok) throw new Error(await r.text()); return r.json(); }
export async function getResult(id){ const r=await fetch(`${API}/api/jobs/${id}/result`); if(!r.ok) throw new Error(await r.text()); return r.json(); }
export function downloadUrl(id,fmt){ return `${API}/api/jobs/${id}/download?format=${fmt}`; }
export async function deleteJob(id){ await fetch(`${API}/api/jobs/${id}`,{method:'DELETE'}); }
