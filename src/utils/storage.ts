import type {Layout} from '../types';

const KEY = 'viet-floor-layouts-v1';
const MAX_SAVED = 20;

export const saveLayout = (l: Layout) => {
  const all = getSaved().filter(x => x.id !== l.id);
  try {
    localStorage.setItem(KEY, JSON.stringify([l, ...all].slice(0, MAX_SAVED)));
  } catch (e) {
    console.error('Không thể lưu vào localStorage:', e);
  }
};

export const removeSaved = (id: string) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(getSaved().filter(x => x.id !== id)));
  } catch (e) {
    console.error('Không thể cập nhật localStorage:', e);
  }
};

export const getSaved = (): Layout[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const exportJson = (l: Layout) => new Blob([JSON.stringify(l, null, 2)], {type: 'application/json'});

export const download = (blob: Blob, name: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
