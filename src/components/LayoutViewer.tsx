import {useState} from 'react';
import type {Layout, Room, ValidationIssue} from '../types';
import {uid} from '../utils/geometry';
import {repairRooms} from '../engine/pipeline/repair';
import {PlanCanvas} from './viewer/PlanCanvas';
import {FloorTabs} from './viewer/FloorTabs';
import {IssueList} from './viewer/IssueList';
import {RoomInspector} from './viewer/RoomInspector';

interface Props {
  layout: Layout;
  onChange: (l: Layout) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function LayoutViewer({layout, onChange, canUndo, canRedo, onUndo, onRedo}: Props) {
  const [floor, setFloor] = useState(1);
  const [grid, setGrid] = useState(true);
  const [zoom, setZoom] = useState(32);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);

  const activeFloor = layout.floors.some(f => f.level === floor) ? floor : layout.floors[0]?.level ?? 1;
  const rooms = layout.floors.find(f => f.level === activeFloor)?.rooms || [];
  const selected = layout.floors.flatMap(f => f.rooms).find(r => r.id === selectedId) || null;

  function patchRoom(id: string, patch: Partial<Room>) {
    const next = structuredClone(layout);
    for (const f of next.floors) {
      const r = f.rooms.find(x => x.id === id);
      if (r) Object.assign(r, patch);
    }
    onChange(next);
  }

  function addRoom() {
    const next = structuredClone(layout);
    const target = next.floors.find(f => f.level === activeFloor);
    if (!target) return;
    const room: Room = {id: uid('room'), name: 'Phòng mới', type: 'storage', floor: activeFloor, x: 0.3, y: 0.3, width: 2, height: 2, targetArea: 4};
    target.rooms.push(room);
    setSelectedId(room.id);
    onChange(next);
  }

  function deleteRoom(id: string) {
    const next = structuredClone(layout);
    for (const f of next.floors) f.rooms = f.rooms.filter(r => r.id !== id);
    if (selectedId === id) setSelectedId(null);
    onChange(next);
  }

  function highlight(issue: ValidationIssue) {
    const ids = issue.roomIds || [];
    setHighlightIds(ids);
    // Nhảy về tầng chứa phòng đầu tiên của cảnh báo.
    const target = layout.floors.find(f => f.rooms.some(r => ids.includes(r.id)));
    if (target) setFloor(target.level);
    window.setTimeout(() => setHighlightIds(h => (h === ids ? [] : h)), 2600);
  }

  function autoFix() {
    const next = structuredClone(layout);
    for (const f of next.floors) {
      f.rooms = repairRooms(f.rooms, layout.input.plot.width, layout.input.plot.depth).rooms;
    }
    onChange(next);
  }

  return (
    <section className="panel">
      <div className="viewerHead">
        <h2>{layout.name} · {layout.score.total}/100</h2>
        <div className="viewerTools">
          <FloorTabs layout={layout} floor={activeFloor} onChange={l => {setFloor(l); setSelectedId(null);}} />
          <button onClick={() => setGrid(!grid)}>Lưới</button>
          <button aria-label="Hoàn tác" disabled={!canUndo} onClick={onUndo}>↶ Hoàn tác</button>
          <button aria-label="Làm lại" disabled={!canRedo} onClick={onRedo}>↷ Làm lại</button>
          <input aria-label="Cỡ bản vẽ" type="range" min="20" max="60" value={zoom} onChange={e => setZoom(+e.target.value)} />
        </div>
      </div>
      <PlanCanvas
        layout={layout}
        floor={activeFloor}
        zoom={zoom}
        grid={grid}
        selectedId={selectedId}
        highlightIds={highlightIds}
        onSelect={setSelectedId}
        onRoomPatch={patchRoom}
      />
      <div className="scoreRow">
        {layout.score.explanations.map((x, i) => <small key={i}>{x}</small>)}
      </div>
      <IssueList layout={layout} onHighlight={highlight} onAutoFix={autoFix} />
      <RoomInspector room={selected} onPatch={patchRoom} onDelete={deleteRoom} onAdd={addRoom} />
      <div className="rooms">
        {rooms.map(r => (
          <span key={r.id} className={r.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(r.id)}>
            {r.name}: {(r.width * r.height).toFixed(1)}m²
          </span>
        ))}
      </div>
    </section>
  );
}
