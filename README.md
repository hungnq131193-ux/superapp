# Xưởng Thiết Kế Mặt Bằng Việt

Web app Vite + React + TypeScript chạy hoàn toàn client-side để sinh phương án mặt bằng nhà ở 2D theo ràng buộc CSP/heuristic. App không dùng backend, không gọi AI cloud bắt buộc và phù hợp deploy miễn phí lên Vercel, Netlify hoặc GitHub Pages.

> Bản vẽ chỉ mang tính tham khảo, cần kiến trúc sư/kỹ sư kiểm tra trước khi thi công.

## Tính năng
- Wizard tiếng Việt nhập loại nhà, kích thước đất, số tầng, hướng, sân, giếng trời, để xe, cầu thang, số phòng, ghi chú.
- Cấu hình diện tích phổ biến cho nhà Việt Nam.
- Constraint engine TypeScript: kiểm tra vượt ranh, chồng lấn, tổng diện tích, WC master, phòng thờ, WC gần phòng khách.
- Generator heuristic: chia mặt bằng theo dải, bố trí gara/phòng khách/bếp/thang/WC và sinh nhiều biến thể chấm điểm.
- Viewer SVG 2D mobile-first: tab tầng, lưới, zoom, màu phòng, kích thước.
- Chỉnh sửa thủ công bằng form tọa độ/kích thước/tên/loại, xóa phòng và tự validation lại.
- Lưu localStorage, nhập/xuất JSON, xuất PNG/SVG/PDF.
- Thư viện preset: nhà ống 5x18 có gara, 4.5x20, 90m² một tầng, nhà phố 6x15, mẫu 89–90m².

## Cài đặt và chạy
```bash
npm install
npm run dev
```
Mở URL Vite hiển thị, thường là `http://localhost:5173`.

## Kiểm thử và build
```bash
npm run test
npm run build
npm run preview
```

## Deploy
- **Vercel/Netlify**: build command `npm run build`, publish directory `dist`.
- **GitHub Pages**: app dùng `base: './'`, có thể publish thư mục `dist` bằng GitHub Actions hoặc `gh-pages`.

## Kiến trúc
- `src/types`: type Plot, Floor, Room, Layout, Constraint/Score.
- `src/engine`: generator, validation, scoring, defaults/presets.
- `src/components`: wizard và viewer/editor.
- `src/utils`: geometry, storage, export/import.
- `src/styles`: CSS mobile-first.
- `tests`: Node test runner cho geometry/constraint/generator.

## Giới hạn hiện tại
- Thuật toán là heuristic CSP đơn giản, chưa thay thế tư vấn kiến trúc.
- Editor bản đầu dùng form tọa độ/kích thước thay vì drag/resize trực tiếp để giữ ổn định trên mobile.
- PDF dùng font Latin không dấu cho phần text kỹ thuật trong file PDF để tránh lỗi font; UI vẫn là tiếng Việt.
