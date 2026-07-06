import {createElement} from 'react';
import type {Layout} from '../types';
import {StaticFloorSvg} from '../components/viewer/StaticFloorSvg';

const FONT = 'Inter, system-ui, Arial, sans-serif';

/** Chuẩn hóa SVG để đứng độc lập: xmlns, nền trắng, font hệ có glyph tiếng Việt. */
function standaloneSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('font-family', FONT);
  const w = svg.getAttribute('width') || String(svg.clientWidth);
  const h = svg.getAttribute('height') || String(svg.clientHeight);
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', w);
  bg.setAttribute('height', h);
  bg.setAttribute('fill', '#ffffff');
  clone.insertBefore(bg, clone.firstChild);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

/** Xuất SVG/PNG của bản vẽ đang hiển thị; PNG nền trắng, scale 2x cho nét. */
export async function exportElement(el: HTMLElement, type: 'png' | 'svg'): Promise<Blob> {
  const svg = el.querySelector('svg');
  if (!svg) throw new Error('Không tìm thấy bản vẽ SVG.');
  const xml = standaloneSvg(svg);
  const svgBlob = new Blob([xml], {type: 'image/svg+xml;charset=utf-8'});
  if (type === 'svg') return svgBlob;

  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('Không tạo được ảnh PNG.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function el(doc: Document, tag: string, text?: string, className?: string): HTMLElement {
  const node = doc.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

/**
 * Xuất PDF qua hộp thoại in của trình duyệt: thông số đất, bản vẽ TỪNG tầng,
 * danh sách phòng, cảnh báo và disclaimer. Hoàn toàn client-side.
 */
export async function exportPdf(layout: Layout): Promise<void> {
  const {renderToStaticMarkup} = await import('react-dom/server');
  const w = window.open('', '_blank');
  if (!w) return;
  const d = w.document;
  d.title = layout.name;

  const style = el(d, 'style');
  style.textContent = `
    body{font-family:${FONT};padding:24px;color:#0f172a}
    h1{margin:0 0 4px}h2{margin:20px 0 6px;page-break-after:avoid}
    table{border-collapse:collapse;margin:8px 0}
    td,th{border:1px solid #cbd5e1;padding:6px 10px;text-align:left}
    svg{max-width:100%;height:auto;page-break-inside:avoid}
    ul{margin:6px 0}
    .warn{color:#b45309}.err{color:#b91c1c}.disclaimer{margin-top:18px;padding:10px;border:1px solid #b91c1c;color:#b91c1c;font-weight:700}
  `;
  d.head.append(style);
  const meta = el(d, 'meta');
  meta.setAttribute('charset', 'utf-8');
  d.head.append(meta);

  d.body.append(el(d, 'h1', layout.name));
  d.body.append(el(d, 'p', `Xuất ngày ${new Date().toLocaleDateString('vi-VN')} · Điểm tổng ${layout.score.total}/100`));

  d.body.append(el(d, 'h2', 'Thông số khu đất'));
  const table = el(d, 'table');
  const rows: [string, string][] = [
    ['Kích thước đất', `${layout.input.plot.width}m x ${layout.input.plot.depth}m (${(layout.input.plot.width * layout.input.plot.depth).toFixed(1)}m²)`],
    ['Số tầng', String(layout.input.plot.floors)],
    ['Hướng mặt tiền', layout.input.plot.frontDirection],
    ['Loại nhà', layout.input.plot.houseType],
    ['Để xe', layout.input.plot.parking === 'car' ? `Ô tô (đỗ ${layout.input.plot.parkingMode === 'transverse' ? 'ngang' : 'dọc'})` : layout.input.plot.parking === 'motorbike' ? 'Xe máy' : 'Không'],
    ['Nhu cầu', `${layout.input.requirements.bedrooms} phòng ngủ · ${layout.input.requirements.wcs} WC`]
  ];
  for (const [k, v] of rows) {
    const tr = el(d, 'tr');
    tr.append(el(d, 'th', k), el(d, 'td', v));
    table.append(tr);
  }
  d.body.append(table);

  const parser = new DOMParser();
  for (const floor of layout.floors) {
    d.body.append(el(d, 'h2', `Mặt bằng tầng ${floor.level}`));
    const markup = renderToStaticMarkup(createElement(StaticFloorSvg, {layout, level: floor.level}));
    const svgDoc = parser.parseFromString(markup, 'image/svg+xml');
    d.body.append(d.importNode(svgDoc.documentElement, true));
    const ul = el(d, 'ul');
    for (const r of floor.rooms) {
      ul.append(el(d, 'li', `${r.name}: ${(r.width * r.height).toFixed(1)}m² (${r.width}m x ${r.height}m)`));
    }
    d.body.append(ul);
  }

  if (layout.issues.length > 0) {
    d.body.append(el(d, 'h2', 'Cảnh báo & lưu ý'));
    const ul = el(d, 'ul');
    for (const i of layout.issues) {
      ul.append(el(d, 'li', `[${i.severity === 'error' ? 'LỖI' : i.severity === 'warning' ? 'Cảnh báo' : 'Ghi chú'}] ${i.message}`, i.severity === 'error' ? 'err' : 'warn'));
    }
    d.body.append(ul);
  }

  d.body.append(el(d, 'p', 'Bản vẽ chỉ mang tính tham khảo ý tưởng bố trí, chưa phải hồ sơ kỹ thuật. Cần kiến trúc sư/kỹ sư kết cấu kiểm tra và hoàn thiện trước khi thi công.', 'disclaimer'));

  w.setTimeout(() => w.print(), 400);
}
