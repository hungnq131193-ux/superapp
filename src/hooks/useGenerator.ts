import {useCallback, useState} from 'react';
import type {DesignInput, Layout} from '../types';
import {generateLayouts} from '../engine/generator';

export function useGenerator() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [active, setActive] = useState<Layout | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = useCallback((input: DesignInput) => {
    setGenerating(true);
    // Nhường một frame cho UI hiển thị trạng thái "đang sinh" trước khi tính toán đồng bộ.
    setTimeout(() => {
      const out = generateLayouts(input, 10);
      setLayouts(out);
      setActive(out[0] ?? null);
      setGenerating(false);
    }, 60);
  }, []);

  const replace = useCallback((l: Layout) => {
    setActive(l);
    setLayouts(xs => xs.map(x => (x.id === l.id ? l : x)));
  }, []);

  const prepend = useCallback((l: Layout) => {
    setLayouts(xs => [l, ...xs]);
    setActive(l);
  }, []);

  return {layouts, active, setActive, generating, generate, replace, prepend};
}
