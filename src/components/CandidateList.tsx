import type {Layout} from '../types';

export function CandidateList({layouts, activeId, onSelect}: {
  layouts: Layout[];
  activeId: string | null;
  onSelect: (l: Layout) => void;
}) {
  if (layouts.length === 0) return null;
  return (
    <section className="cards">
      {layouts.map(l => (
        <button className={activeId === l.id ? 'card active' : 'card'} key={l.id} onClick={() => onSelect(l)}>
          <b>{l.name}</b>
          <span>{l.score.total}/100</span>
          <small>{l.issues.length} cảnh báo</small>
        </button>
      ))}
    </section>
  );
}
