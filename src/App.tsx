import {useEffect, useState} from 'react';
import {defaultInput} from './engine/defaults';
import {recomputeLayout} from './engine';
import {Wizard} from './components/Wizard';
import {LayoutViewer} from './components/LayoutViewer';
import {AppHeader} from './components/AppHeader';
import {Hero} from './components/Hero';
import {SavedLibrary} from './components/SavedLibrary';
import {CandidateList} from './components/CandidateList';
import {ExportBar} from './components/ExportBar';
import {useGenerator} from './hooks/useGenerator';
import {useSavedLayouts} from './hooks/useSavedLayouts';
import {useLayoutHistory} from './hooks/useLayoutHistory';
import {parseLayoutJson} from './utils/importSchema';
import type {DesignInput, Layout} from './types';
import './styles/main.css';

export default function App() {
  const [input, setInput] = useState<DesignInput>(defaultInput);
  const [dark, setDark] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const {layouts, active, setActive, generating, generate, replace, prepend} = useGenerator();
  const {saved, save} = useSavedLayouts();
  const history = useLayoutHistory();

  // Layout đang xem đổi (sinh mới/chọn card/nhập JSON) → lịch sử undo bắt đầu lại.
  useEffect(() => {
    if (active?.id !== history.layout?.id) history.reset(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  function update(l: Layout) {
    const computed = history.commit(l);
    replace(computed);
  }

  function undo() {
    const prev = history.undo();
    if (prev) replace(prev);
  }

  function redo() {
    const next = history.redo();
    if (next) replace(next);
  }

  function importJson(f: File) {
    f.text()
      .then(t => {
        const result = parseLayoutJson(t);
        if (result.ok) {
          setImportErrors([]);
          prepend(result.layout);
        } else {
          setImportErrors(result.errors);
        }
      })
      .catch(() => setImportErrors(['Không đọc được tệp. Hãy thử lại với tệp JSON đã xuất từ ứng dụng này.']));
  }

  return (
    <main className={dark ? 'dark' : ''}>
      <AppHeader dark={dark} onToggleDark={() => setDark(!dark)} />
      <Hero onNewDesign={() => {setActive(null); window.scrollTo(0, 0);}} />
      <div className="layout">
        <Wizard input={input} setInput={setInput} onGenerate={() => generate(input)} />
        <SavedLibrary saved={saved} onSelect={setActive} onImportFile={importJson} />
      </div>
      {importErrors.length > 0 && (
        <div className="importErrors panel" role="alert">
          <b>Không nhập được tệp JSON:</b>
          <ul>{importErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          <button onClick={() => setImportErrors([])}>Đóng</button>
        </div>
      )}
      {generating && <div className="loading">Đang sinh phương án theo ràng buộc…</div>}
      <CandidateList layouts={layouts} activeId={active?.id ?? null} onSelect={setActive} />
      {active && (
        <div>
          <LayoutViewer
            layout={active}
            onChange={update}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={undo}
            onRedo={redo}
          />
          <ExportBar layout={active} onSave={save} />
        </div>
      )}
      <footer>Bản vẽ chỉ mang tính tham khảo, cần kiến trúc sư/kỹ sư kiểm tra trước khi thi công.</footer>
    </main>
  );
}
