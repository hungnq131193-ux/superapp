import type {Layout} from '../../types';

export function FloorTabs({layout, floor, onChange}: {layout: Layout; floor: number; onChange: (level: number) => void}) {
  return (
    <div className="floorTabs" role="tablist" aria-label="Chọn tầng">
      {layout.floors.map(f => (
        <button
          key={f.level}
          role="tab"
          aria-selected={f.level === floor}
          className={f.level === floor ? 'active' : ''}
          onClick={() => onChange(f.level)}
        >
          Tầng {f.level}
        </button>
      ))}
    </div>
  );
}
