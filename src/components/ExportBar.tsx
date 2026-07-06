import type {Layout} from '../types';
import {download, exportJson} from '../utils/storage';
import {exportElement, exportPdf} from '../utils/exporters';

export function ExportBar({layout, onSave}: {layout: Layout; onSave: (l: Layout) => void}) {
  async function exportImg(t: 'png' | 'svg') {
    const el = document.getElementById('plan-canvas');
    if (!el) return;
    try {
      download(await exportElement(el, t), `${layout.name}.${t}`);
    } catch (e) {
      console.error('Xuất ảnh thất bại:', e);
    }
  }
  return (
    <section className="panel actions">
      <button onClick={() => onSave(layout)}>Lưu localStorage</button>
      <button onClick={() => download(exportJson(layout), `${layout.name}.json`)}>Xuất JSON</button>
      <button onClick={() => exportImg('png')}>Xuất PNG</button>
      <button onClick={() => exportImg('svg')}>Xuất SVG</button>
      <button onClick={() => exportPdf(layout)}>Xuất PDF</button>
    </section>
  );
}
