export default function UploadBox({file,setFile,onSubmit,busy}){
  const pick=f=>{ if(f) setFile(f); };
  return <section className="upload" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); pick(e.dataTransfer.files[0]);}}>
    <div className="icon">📄</div><h2>Kéo-thả ảnh hoặc PDF</h2><p>Hỗ trợ JPG, PNG, WEBP, PDF. OCR chạy ở backend/server CPU hoặc GPU.</p>
    <input id="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf" onChange={e=>pick(e.target.files[0])}/><label htmlFor="file">Chọn file</label>
    {file && <div className="file"><b>{file.name}</b><span>{file.type || 'unknown'} · {(file.size/1024/1024).toFixed(2)} MB</span></div>}
    <button disabled={!file||busy} onClick={onSubmit}>{busy?'Đang xử lý...':'Bắt đầu OCR'}</button>
  </section>
}
