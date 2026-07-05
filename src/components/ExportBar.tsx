import type {Layout} from '../types';
import {download, exportJson} from '../utils/storage';
import {exportElement, exportPdf} from '../utils/exporters';

export function ExportBar({layout, onSave}: {layout: Layout; onSave: (l: Layout) => void}) {
  async function exportImg(t: 'png' | 'svg') {
    const el = document.getElementById('plan-canvas');
    if (!el) return;
    const data = await exportElement(el, t);
    download(await (await fetch(data)).blob(), `${layout.name}.${t}`);
  }
  return (
    <section className="panel actions">
      <button onClick={() => onSave(layout)}>Lưu localStorage</button>
      <button onClick={() => download(exportJson(layout), `${layout.name}.json`)}>Xuất JSON</button>
      <button onClick={() => exportImg('png')}>Xuất PNG</button>
      <button onClick={() => exportImg('svg')}>Xuất SVG</button>
      <button onClick={() => {
        const el = document.getElementById('plan-canvas');
        if (el) exportPdf(layout, el);
      }}>Xuất PDF</button>
    </section>
  );
}
