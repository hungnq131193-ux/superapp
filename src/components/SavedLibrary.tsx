import type {Layout} from '../types';

export function SavedLibrary({saved, onSelect, onImportFile}: {
  saved: Layout[];
  onSelect: (l: Layout) => void;
  onImportFile: (f: File) => void;
}) {
  return (
    <aside className="panel">
      <h2>Thư viện đã lưu</h2>
      {saved.length === 0 && <p><small>Chưa có phương án nào được lưu.</small></p>}
      {saved.map(l => (
        <button key={l.id} onClick={() => onSelect(l)}>{l.name} · {l.score.total}</button>
      ))}
      <label className="import">
        Nhập JSON
        <input
          type="file"
          accept="application/json"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = '';
          }}
        />
      </label>
    </aside>
  );
}
