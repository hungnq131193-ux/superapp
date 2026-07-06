import {useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import type {Layout, Room} from '../../types';
import {useZoomPan} from '../../hooks/useZoomPan';

export const ROOM_COLORS: Record<string, string> = {
  living: '#fbbf24', kitchen: '#fb923c', bedroom: '#60a5fa', master: '#818cf8',
  wc: '#2dd4bf', 'master-wc': '#14b8a6', worship: '#c084fc', garage: '#94a3b8',
  stair: '#f87171', void: '#86efac', yard: '#bbf7d0', laundry: '#a7f3d0',
  storage: '#d6d3d1', balcony: '#bae6fd', corridor: '#e2e8f0'
};

const PAD_X = 40;
const PAD_Y = 20;
const snap = (v: number) => Math.round(v * 10) / 10;

interface Props {
  layout: Layout;
  floor: number;
  zoom: number;
  grid: boolean;
  selectedId: string | null;
  highlightIds: string[];
  onSelect: (id: string | null) => void;
  onRoomPatch: (id: string, patch: Partial<Room>) => void;
}

type DragMode = {kind: 'move' | 'resize'; id: string; startX: number; startY: number; room: Room} | null;

export function PlanCanvas({layout, floor, zoom, grid, selectedId, highlightIds, onSelect, onRoomPatch}: Props) {
  const {transform: t, handlers, zoomBy, reset, suspend} = useZoomPan();
  const svgRef = useRef<SVGSVGElement>(null);
  const downRef = useRef<{x: number; y: number} | null>(null);
  const [drag, setDrag] = useState<DragMode>(null);
  const [draft, setDraft] = useState<Room | null>(null);

  const rooms = layout.floors.find(f => f.level === floor)?.rooms || [];
  const W = layout.input.plot.width;
  const D = layout.input.plot.depth;
  const selected = rooms.find(r => r.id === selectedId) || null;

  /** Đổi tọa độ màn hình → mét trên bản vẽ (rect đã bao gồm CSS transform pan/zoom). */
  function toMeters(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const k = rect.width / (W * zoom + 70); // hệ số scale thực tế đang áp
    return {mx: ((clientX - rect.left) / k - PAD_X) / zoom, my: ((clientY - rect.top) / k - PAD_Y) / zoom};
  }

  function roomAt(mx: number, my: number): Room | null {
    // Ưu tiên phòng nhỏ khi lồng nhau (WC trong dải master).
    const hits = rooms.filter(r => mx >= r.x && mx <= r.x + r.width && my >= r.y && my <= r.y + r.height);
    return hits.sort((a, b) => a.width * a.height - b.width * b.height)[0] || null;
  }

  function onDown(e: ReactPointerEvent) {
    downRef.current = {x: e.clientX, y: e.clientY};
    const m = toMeters(e.clientX, e.clientY);
    if (m && selected) {
      const cornerX = selected.x + selected.width;
      const cornerY = selected.y + selected.height;
      const tolerance = 14 / (zoom * t.k); // ~14px màn hình
      if (Math.hypot(m.mx - cornerX, m.my - cornerY) <= tolerance) {
        suspend(true);
        setDrag({kind: 'resize', id: selected.id, startX: m.mx, startY: m.my, room: selected});
        setDraft(selected);
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        return;
      }
      const hit = roomAt(m.mx, m.my);
      if (hit && hit.id === selected.id) {
        suspend(true);
        setDrag({kind: 'move', id: selected.id, startX: m.mx, startY: m.my, room: selected});
        setDraft(selected);
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        return;
      }
    }
    handlers.onPointerDown(e);
  }

  function onMove(e: ReactPointerEvent) {
    if (drag) {
      const m = toMeters(e.clientX, e.clientY);
      if (!m) return;
      const dx = m.mx - drag.startX;
      const dy = m.my - drag.startY;
      if (drag.kind === 'move') {
        setDraft({...drag.room, x: snap(drag.room.x + dx), y: snap(drag.room.y + dy)});
      } else {
        setDraft({
          ...drag.room,
          width: Math.max(0.7, snap(drag.room.width + dx)),
          height: Math.max(0.7, snap(drag.room.height + dy))
        });
      }
      return;
    }
    handlers.onPointerMove(e);
  }

  function onUp(e: ReactPointerEvent) {
    if (drag && draft) {
      const {id} = drag;
      const patch = drag.kind === 'move' ? {x: draft.x, y: draft.y} : {width: draft.width, height: draft.height};
      setDrag(null);
      setDraft(null);
      suspend(false);
      onRoomPatch(id, patch);
      return;
    }
    handlers.onPointerUp(e);
    const d = downRef.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) {
      const m = toMeters(e.clientX, e.clientY);
      onSelect(m ? roomAt(m.mx, m.my)?.id ?? null : null);
    }
    downRef.current = null;
  }

  const shown = (r: Room): Room => (draft && r.id === draft.id ? draft : r);

  return (
    <div className="viewer">
      <div className="zoomBar">
        <button aria-label="Phóng to" onClick={() => zoomBy(1.25)}>+</button>
        <button aria-label="Thu nhỏ" onClick={() => zoomBy(0.8)}>−</button>
        <button aria-label="Về mặc định" onClick={reset}>⤾</button>
        <small>Chạm chọn phòng · kéo phòng đã chọn để di chuyển · 2 ngón để zoom</small>
      </div>
      <div
        id="plan-canvas"
        className="canvasWrap"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={handlers.onWheel}
      >
        <div className="viewport" style={{transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})`, transformOrigin: '0 0'}}>
          <svg ref={svgRef} width={W * zoom + 70} height={D * zoom + 70} role="img" aria-label={`Mặt bằng tầng ${floor}`}>
            <defs>
              <pattern id="grid" width={zoom} height={zoom} patternUnits="userSpaceOnUse">
                <path d={`M ${zoom} 0 L 0 0 0 ${zoom}`} fill="none" stroke="#e2e8f0" strokeWidth="1" />
              </pattern>
            </defs>
            <g transform={`translate(${PAD_X} ${PAD_Y})`}>
              <rect width={W * zoom} height={D * zoom} fill={grid ? 'url(#grid)' : '#fff'} stroke="#0f172a" strokeWidth="2" />
              {rooms.map(raw => {
                const r = shown(raw);
                const isSel = r.id === selectedId;
                const isHot = highlightIds.includes(r.id);
                return (
                  <g key={r.id}>
                    <rect
                      x={r.x * zoom}
                      y={r.y * zoom}
                      width={r.width * zoom}
                      height={r.height * zoom}
                      fill={ROOM_COLORS[r.type] || '#ddd'}
                      stroke={isHot ? '#dc2626' : isSel ? '#0f766e' : '#0f172a'}
                      strokeWidth={isHot || isSel ? 3 : 1}
                      rx="6"
                      opacity=".92"
                      className={isHot ? 'roomHot' : undefined}
                    />
                    {r.width * zoom > 46 && r.height * zoom > 22 && (
                      <text x={(r.x + 0.12) * zoom} y={(r.y + 0.5) * zoom} fontSize="12" fontWeight="700">{r.name}</text>
                    )}
                    {r.width * zoom > 60 && r.height * zoom > 40 && (
                      <text x={(r.x + 0.12) * zoom} y={(r.y + 0.95) * zoom} fontSize="11">
                        {(r.width * r.height).toFixed(1)}m² · {r.width}x{r.height}m
                      </text>
                    )}
                    {isSel && (
                      <circle
                        cx={(r.x + r.width) * zoom}
                        cy={(r.y + r.height) * zoom}
                        r="9"
                        fill="#0f766e"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    )}
                  </g>
                );
              })}
              <text x={(W * zoom) / 2 - 22} y={-6}>{W}m</text>
              <text x={W * zoom + 8} y={(D * zoom) / 2}>{D}m</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
