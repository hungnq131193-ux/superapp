import {useCallback, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent} from 'react';

export interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

/**
 * Zoom/pan cho viewer SVG bằng pointer events: 1 chạm kéo = pan,
 * 2 chạm = pinch zoom, con lăn = zoom quanh con trỏ.
 * Phần tử áp handlers cần CSS `touch-action: none`.
 */
export function useZoomPan() {
  const [t, setT] = useState<ViewTransform>({x: 0, y: 0, k: 1});
  const pointers = useRef(new Map<number, {x: number; y: number}>());
  const gesture = useRef<{t: ViewTransform; dist: number; cx: number; cy: number} | null>(null);
  /** Khi một phòng đang được kéo, viewer tạm ngừng pan. */
  const suspended = useRef(false);

  const begin = useCallback(() => {
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      gesture.current = {t, dist: 0, cx: pts[0].x, cy: pts[0].y};
    } else if (pts.length >= 2) {
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      gesture.current = {
        t,
        dist: Math.hypot(dx, dy),
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2
      };
    }
  }, [t]);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
    begin();
  }, [begin]);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (suspended.current || !gesture.current) return;
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length === 1) {
      setT({...g.t, x: g.t.x + pts[0].x - g.cx, y: g.t.y + pts[0].y - g.cy});
    } else if (pts.length >= 2 && g.dist > 0) {
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const k = Math.min(6, Math.max(0.4, (g.t.k * Math.hypot(dx, dy)) / g.dist));
      // Giữ điểm giữa hai ngón cố định trên màn hình khi zoom.
      setT({
        k,
        x: cx - ((g.cx - g.t.x) / g.t.k) * k,
        y: cy - ((g.cy - g.t.y) / g.t.k) * k
      });
    }
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    begin();
  }, [begin]);

  const onWheel = useCallback((e: ReactWheelEvent) => {
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setT(prev => {
      const k = Math.min(6, Math.max(0.4, prev.k * (e.deltaY < 0 ? 1.12 : 0.9)));
      return {k, x: px - ((px - prev.x) / prev.k) * k, y: py - ((py - prev.y) / prev.k) * k};
    });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setT(prev => ({...prev, k: Math.min(6, Math.max(0.4, prev.k * factor))}));
  }, []);

  const reset = useCallback(() => setT({x: 0, y: 0, k: 1}), []);
  const suspend = useCallback((on: boolean) => {
    suspended.current = on;
    if (!on) gesture.current = null;
  }, []);

  return {
    transform: t,
    handlers: {onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel},
    zoomBy,
    reset,
    suspend
  };
}
