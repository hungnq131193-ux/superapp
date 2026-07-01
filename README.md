# Xưởng Thiết Kế Mặt Bằng Việt

Web app Vite + React + TypeScript chạy hoàn toàn client-side để sinh phương án mặt bằng nhà ở 2D theo ràng buộc CSP/heuristic. App không dùng backend, không dùng Java/Jython/JVM và phù hợp deploy miễn phí lên Vercel, Netlify hoặc GitHub Pages.

> “Bản vẽ chỉ mang tính tham khảo ý tưởng, không phải hồ sơ thiết kế thi công. Cần kiến trúc sư/kỹ sư kiểm tra kết cấu, thông gió, cấp thoát nước, phòng cháy và quy chuẩn địa phương trước khi xây dựng.”

## Nguồn thuật toán và attribution

App mới được xây lại dựa trên repo `z-aqib/Floor-Plan-Generator-Using-AI`. Repo gốc mô tả hệ thống sinh mặt bằng bằng **CSP (Constraint Satisfaction Problem Tree)**, backend Python, frontend Java và ghép bằng Jython. Trong quá trình chuyển đổi web, phần lõi trong `src/final.py` đã được port sang TypeScript tại `src/engine/original-port/cspTree.ts`:

- `TreeNode` → `CspTreeNode`.
- `add_room_to_tree` → `addRoomToTree`.
- `build_room_design` → `buildRoomDesign`.
- `check_constraints` → `checkConstraints`.
- `permutations` / `rearrange_rooms` → `permutations` / `rearrangeRooms`.
- Các ràng buộc cấm kề Kitchen/Store/Bathroom với master/guest suite, quy tắc Garage/Balcony của repo gốc được giữ lại và dùng làm seed thứ tự phòng cho generator mới.

Không tìm thấy LICENSE rõ ràng trong repo gốc qua trang GitHub công khai. **Source algorithm adapted from z-aqib/Floor-Plan-Generator-Using-AI; verify license/permission before public/commercial release.** Không xóa attribution tác giả gốc nếu tiếp tục copy/modify code.

## Tính năng

- Dashboard tiếng Việt với nút tạo thiết kế, nhập JSON, mở thiết kế đã lưu và mẫu nhanh.
- Wizard mobile-first nhập thông tin đất, số tầng, hướng, loại nhà, sân/giếng trời, để xe, cầu thang, phòng ngủ, phòng thờ, giặt phơi và diện tích min/max.
- Preset nhà Việt Nam: nhà ống 5×18 có gara, 4.5×20 bốn phòng ngủ, nhà 1 tầng 90m², nhà phố 6×15, mẫu 89–90m² và mẫu 5×18 tối ưu xe dọc/master WC/phòng thờ lối riêng.
- Engine TypeScript chạy trong browser: CSP-order seed port từ repo gốc + heuristic chia dải mặt bằng + validation + scoring.
- Sinh mặc định 10 phương án tốt nhất, có thể mở rộng đến 50 seed CSP.
- Viewer SVG 2D theo tỷ lệ: ranh đất, lưới, thước ngang/sâu, tab tầng, màu phòng, tên phòng, diện tích, kích thước, ký hiệu tường/cửa/cầu thang/WC tối giản.
- Chỉnh sửa thủ công: chọn qua danh sách phòng, sửa tên/loại/x/y/w/h, thêm phòng, xóa phòng, tự validation lại sau khi sửa.
- Lưu localStorage, danh sách thiết kế đã lưu, nhập/xuất JSON, xuất SVG, PNG và PDF.

## Constraint/validation

Engine kiểm tra các nhóm lỗi/cảnh báo chính:

- Phòng không chồng lên nhau.
- Phòng không vượt ranh đất.
- Tổng diện tích phòng không vượt diện tích sàn quá mức cho phép.
- Có lối đi và vùng cầu thang/hành lang cho phòng chính.
- WC riêng master phải nằm trong hoặc sát master.
- Hạn chế WC đặt vô lý giữa phòng khách.
- Phòng thờ có lối tiếp cận riêng nếu người dùng yêu cầu.
- Tầng 1 có ô tô trên đất hẹp ưu tiên đỗ dọc.
- Cầu thang đồng trục giữa các tầng.
- WC nên gom trục kỹ thuật.
- Phòng ngủ nên có mặt thoáng/cửa sổ nếu có thể.
- Cảnh báo khi nhu cầu phòng vượt khả năng diện tích.

## Cài đặt và chạy

```bash
npm install
npm run dev
```

Mở URL Vite hiển thị, thường là `http://localhost:5173`.

## Kiểm thử và build

```bash
npm run lint
npm run test
npm run build
npm run preview
```

## Deploy

- **Vercel**: Framework Preset `Vite`, build command `npm run build`, output directory `dist`.
- **Netlify**: build command `npm run build`, publish directory `dist`.
- **GitHub Pages**: app dùng `base: './'`, publish thư mục `dist` bằng GitHub Actions hoặc nhánh `gh-pages`.

Không cần backend/VPS vì engine chạy client-side.

## Kiến trúc

- `src/types/`: kiểu dữ liệu plot, room, floor, layout, score, issue.
- `src/engine/original-port/`: phần CSP Tree port từ repo gốc.
- `src/engine/validation/`: thư mục dành cho validation mở rộng; validation runtime hiện nằm tại `src/engine/validation.ts`.
- `src/engine/scoring/`: thư mục dành cho scoring mở rộng; scoring runtime hiện nằm tại `src/engine/scoring.ts`.
- `src/geometry/`: thư mục dành cho module hình học mở rộng; helper runtime hiện nằm tại `src/utils/geometry.ts`.
- `src/components/`: wizard và viewer/editor.
- `src/pages/`: thư mục dành cho tách trang khi app lớn hơn.
- `src/storage/`: thư mục dành cho adapter lưu trữ mở rộng; runtime hiện ở `src/utils/storage.ts`.
- `src/export/`: thư mục dành cho exporter mở rộng; runtime hiện ở `src/utils/exporters.ts`.
- `src/presets/`: thư mục dành cho preset mở rộng; preset runtime hiện nằm tại `src/engine/defaults.ts`.
- `src/styles/`: CSS mobile-first.
- `tests/`: test constraint/generator/original-port bằng Node test runner.

## Giới hạn hiện tại

- Đây là generator ý tưởng, không phải CAD/BIM hay hồ sơ thi công.
- Bản port giữ bản chất CSP Tree của repo gốc nhưng bổ sung heuristic Việt hóa để tạo tọa độ 2D thực tế hơn cho web.
- Editor bản đầu ưu tiên form tọa độ ổn định trên mobile; drag/resize trực tiếp có thể bổ sung sau.
- PDF xuất bằng SVG/text đơn giản để giảm dependency; font tiếng Việt phụ thuộc trình duyệt/PDF viewer.
