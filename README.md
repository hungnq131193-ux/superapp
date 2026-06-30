# PaddleOCR Web App

Web app OCR ảnh/PDF dựa trên package chính thức PaddleOCR 3.x, gồm FastAPI backend và React + Vite frontend. Backend xử lý OCR trên CPU mặc định hoặc GPU server nếu cài PaddlePaddle GPU; điện thoại chỉ dùng trình duyệt để upload và xem kết quả.

## Tài liệu PaddleOCR đã tham khảo
- README chính thức PaddleOCR cho biết PaddleOCR chuyển PDF/ảnh thành JSON/Markdown, hỗ trợ PP-StructureV3 và nhiều ngôn ngữ.
- Tài liệu PP-StructureV3 cho pipeline parsing tài liệu, layout, table, markdown/json.
- Tài liệu PaddleOCR-VL/3.x xác nhận API `predict(...)` và package `paddleocr[doc-parser]` cho parsing nâng cao.

## Tính năng
- Upload JPG/JPEG/PNG/WEBP/PDF bằng kéo-thả hoặc chọn file.
- OCR theo job_id: `/api/ocr`, theo dõi trạng thái, tải TXT/JSON/MD.
- PDF nhiều trang: chế độ `simple` convert từng trang bằng PyMuPDF; chế độ `structure` đưa PDF vào pipeline PP-StructureV3 và fallback về OCR thường nếu lỗi.
- Kết quả: text, JSON có page/box/confidence nếu pipeline trả về, markdown nếu có, preview ảnh với overlay bounding box.
- Quyền riêng tư: xóa file upload và ảnh tạm sau khi xử lý, không lưu database/lịch sử mặc định; kết quả trong RAM và hết hạn theo TTL.

## Chạy local
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

Mở http://localhost:5173.

## Docker CPU mặc định
```bash
cp .env.example .env
docker compose up --build
```
Lần chạy đầu có thể lâu vì PaddleOCR tải model. Cache model được mount bằng volume `paddleocr-cache` và `paddle-models`.

## CPU/GPU
Biến môi trường chính:

| Biến | Mặc định | Mô tả |
|---|---:|---|
| `USE_GPU` | `false` | Bật GPU backend/server. |
| `DEVICE` | `cpu` | `cpu` hoặc `gpu`. |
| `OCR_MODE` | `structure` | `structure` dùng PP-StructureV3, fallback simple; `simple` OCR text thường. |
| `OCR_LANG` | `vi_en` | App map `vi_en` sang `vi` vì PaddleOCR nhận một mã lang. Dùng `en` nếu chỉ tiếng Anh. |
| `MAX_FILE_SIZE_MB` | `25` | Giới hạn upload. |
| `DELETE_FILE_AFTER_PROCESS` | `true` | Xóa file sau OCR. |
| `TEMP_DIR` | `/tmp/paddleocr-web` | Thư mục tạm. |
| `OCR_JOB_TTL_SECONDS` | `300` | TTL job/result trong RAM. |

GPU cần CUDA/cuDNN và PaddlePaddle GPU tương thích. Ví dụ theo tài liệu PaddleOCR-VL cho CUDA 12.6:
```bash
python -m pip install paddlepaddle-gpu==3.2.1 -i https://www.paddlepaddle.org.cn/packages/stable/cu126/
python -m pip install -U "paddleocr[doc-parser]>=3.4.0"
```
Sau đó đặt `USE_GPU=true`, `DEVICE=gpu`. Nếu server không có GPU/CUDA, giữ CPU hoặc backend sẽ báo lỗi dễ hiểu trong job.

## API endpoints
- `GET /health` trả trạng thái, device, mode, lang.
- `POST /api/ocr` nhận multipart `file`, trả `job_id`.
- `GET /api/jobs/{job_id}` trả `queued|processing|done|error`.
- `GET /api/jobs/{job_id}/result` trả OCR result.
- `GET /api/jobs/{job_id}/download?format=txt|json|md` tải kết quả.
- `DELETE /api/jobs/{job_id}` xóa job/result/file tạm nếu còn.

## Test
```bash
cd backend
pytest
```
Test OCR dùng mock nên không tải model trong CI.

## Lưu ý PDF
Chế độ `structure` ưu tiên pipeline document parsing hiện tại của PaddleOCR. Nếu pipeline không hỗ trợ môi trường/model, app fallback sang OCR thường. Chế độ `simple` convert PDF sang ảnh bằng PyMuPDF, xử lý từng trang, rồi xóa ảnh tạm từng trang.

## Tiếng Việt / tiếng Anh
PaddleOCR API nhận một mã ngôn ngữ. App mặc định `OCR_LANG=vi_en` và map sang `vi` để ưu tiên tiếng Việt; đổi sang `en` cho tài liệu tiếng Anh. Nếu tiếng Việt chưa tối ưu với tài liệu của bạn, có thể thay model/cấu hình PaddleOCR ở `OCRService._lang()` và phần khởi tạo pipeline.

## Quyền riêng tư & bảo mật
- Kiểm tra extension và MIME type.
- Giới hạn dung lượng upload.
- Tạo tên file UUID, không dùng path người dùng nên tránh path traversal.
- Không render OCR bằng `innerHTML`; frontend dùng text/`pre`.
- Không commit upload/output/cache/model weight; xem `.gitignore`.
- File upload và file tạm bị xóa sau xử lý; kết quả chỉ ở RAM trong thời gian TTL.

## Lỗi thường gặp
- **Cài PaddlePaddle lỗi**: kiểm tra Python/CUDA đúng phiên bản; CPU nên dùng Python 3.11 và `paddlepaddle>=3.1.0`.
- **Lần đầu rất chậm**: model đang được tải về cache.
- **GPU không chạy**: kiểm tra `nvidia-smi`, CUDA/cuDNN, package `paddlepaddle-gpu`, và đặt `USE_GPU=true DEVICE=gpu`.
- **Không có Markdown/layout**: môi trường không chạy được PP-StructureV3 hoặc `OCR_MODE=simple`; xem JSON/Text fallback.

## Hướng mở rộng
Có thể thử WebGPU/ONNX hoặc PaddleOCR.js cho OCR trực tiếp trên trình duyệt/điện thoại trong tương lai. Bản chính này không triển khai GPU điện thoại cho backend.
