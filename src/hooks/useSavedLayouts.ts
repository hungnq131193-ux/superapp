import {useCallback, useState} from 'react';
import type {Layout} from '../types';
import {getSaved, saveLayout, removeSaved} from '../utils/storage';

export function useSavedLayouts() {
  const [saved, setSaved] = useState<Layout[]>(() => getSaved());
  const refresh = useCallback(() => setSaved(getSaved()), []);
  const save = useCallback((l: Layout) => {
    saveLayout(l);
    setSaved(getSaved());
  }, []);
  const remove = useCallback((id: string) => {
    removeSaved(id);
    setSaved(getSaved());
  }, []);
  return {saved, save, remove, refresh};
}
