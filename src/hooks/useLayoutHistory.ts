import {useCallback, useRef, useState} from 'react';
import type {Layout} from '../types';
import {recomputeLayout} from '../engine';

const CAP = 50;

interface HistoryState {
  past: Layout[];
  present: Layout | null;
  future: Layout[];
}

/**
 * Undo/redo bằng snapshot layout; mỗi commit tự tính lại issues + score.
 * Dùng ref làm nguồn sự thật để undo()/redo() trả kết quả đồng bộ trong event handler.
 */
export function useLayoutHistory() {
  const ref = useRef<HistoryState>({past: [], present: null, future: []});
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const reset = useCallback((l: Layout | null) => {
    ref.current = {past: [], present: l, future: []};
    bump();
  }, [bump]);

  const commit = useCallback((next: Layout): Layout => {
    const computed = recomputeLayout(next);
    const s = ref.current;
    ref.current = {
      past: s.present ? [...s.past.slice(-CAP + 1), s.present] : s.past,
      present: computed,
      future: []
    };
    bump();
    return computed;
  }, [bump]);

  const undo = useCallback((): Layout | null => {
    const s = ref.current;
    if (s.past.length === 0 || !s.present) return null;
    const prev = s.past[s.past.length - 1];
    ref.current = {past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future]};
    bump();
    return prev;
  }, [bump]);

  const redo = useCallback((): Layout | null => {
    const s = ref.current;
    if (s.future.length === 0 || !s.present) return null;
    const next = s.future[0];
    ref.current = {past: [...s.past, s.present], present: next, future: s.future.slice(1)};
    bump();
    return next;
  }, [bump]);

  return {
    layout: ref.current.present,
    canUndo: ref.current.past.length > 0,
    canRedo: ref.current.future.length > 0,
    reset,
    commit,
    undo,
    redo
  };
}
