import {useState} from 'react';
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
import type {DesignInput, Layout} from './types';
import './styles/main.css';

export default function App() {
  const [input, setInput] = useState<DesignInput>(defaultInput);
  const [dark, setDark] = useState(false);
  const {layouts, active, setActive, generating, generate, replace, prepend} = useGenerator();
  const {saved, save} = useSavedLayouts();

  function update(l: Layout) {
    replace(recomputeLayout(l));
  }

  function importJson(f: File) {
    f.text()
      .then(t => {
        const l = JSON.parse(t) as Layout;
        prepend(l);
      })
      .catch(e => console.error('Không đọc được tệp JSON:', e));
  }

  return (
    <main className={dark ? 'dark' : ''}>
      <AppHeader dark={dark} onToggleDark={() => setDark(!dark)} />
      <Hero onNewDesign={() => {setActive(null); window.scrollTo(0, 0);}} />
      <div className="layout">
        <Wizard input={input} setInput={setInput} onGenerate={() => generate(input)} />
        <SavedLibrary saved={saved} onSelect={setActive} onImportFile={importJson} />
      </div>
      {generating && <div className="loading">Đang sinh phương án theo ràng buộc…</div>}
      <CandidateList layouts={layouts} activeId={active?.id ?? null} onSelect={setActive} />
      {active && (
        <div>
          <LayoutViewer layout={active} onChange={update} />
          <ExportBar layout={active} onSave={save} />
        </div>
      )}
      <footer>Bản vẽ chỉ mang tính tham khảo, cần kiến trúc sư/kỹ sư kiểm tra trước khi thi công.</footer>
    </main>
  );
}
