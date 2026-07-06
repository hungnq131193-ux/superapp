import type {Layout} from '../../types';
import {ROOM_COLORS} from './PlanCanvas';

const FONT = 'Inter, system-ui, Arial, sans-serif';

/** SVG thuần một tầng (không tương tác) — dùng cho xuất PDF/PNG/SVG. */
export function StaticFloorSvg({layout, level, zoom = 32}: {layout: Layout; level: number; zoom?: number}) {
  const W = layout.input.plot.width;
  const D = layout.input.plot.depth;
  const rooms = layout.floors.find(f => f.level === level)?.rooms || [];
  const width = W * zoom + 70;
  const height = D * zoom + 70;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} fontFamily={FONT}>
      <rect width={width} height={height} fill="#ffffff" />
      <g transform="translate(40 20)">
        <rect width={W * zoom} height={D * zoom} fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
        {rooms.map(r => (
          <g key={r.id}>
            <rect
              x={r.x * zoom}
              y={r.y * zoom}
              width={r.width * zoom}
              height={r.height * zoom}
              fill={ROOM_COLORS[r.type] || '#ddd'}
              stroke="#0f172a"
              rx="6"
              opacity=".92"
            />
            {r.width * zoom > 46 && r.height * zoom > 22 && (
              <text x={(r.x + 0.12) * zoom} y={(r.y + 0.5) * zoom} fontSize="12" fontWeight="700" fill="#0f172a">{r.name}</text>
            )}
            {r.width * zoom > 60 && r.height * zoom > 40 && (
              <text x={(r.x + 0.12) * zoom} y={(r.y + 0.95) * zoom} fontSize="11" fill="#0f172a">
                {(r.width * r.height).toFixed(1)}m² · {r.width}x{r.height}m
              </text>
            )}
          </g>
        ))}
        <text x={(W * zoom) / 2 - 22} y={-6} fill="#0f172a">{W}m</text>
        <text x={W * zoom + 8} y={(D * zoom) / 2} fill="#0f172a">{D}m</text>
      </g>
    </svg>
  );
}
