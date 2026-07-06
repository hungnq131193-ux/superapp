import {beforeEach, describe, expect, test, vi} from 'vitest';
import {generateLayouts} from '../src/engine/pipeline';
import {applyPreset, presets} from '../src/engine/defaults';
import {getSaved, removeSaved, saveLayout} from '../src/utils/storage';
import type {Layout} from '../src/types';

// Shim localStorage cho môi trường node.
function installLocalStorage() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    }
  };
  vi.stubGlobal('localStorage', mock);
  return {store, mock};
}

function sample(seedOffset = 0): Layout {
  return generateLayouts(applyPreset(presets[0]), 10, 100 + seedOffset)[0];
}

describe('storage', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    ({store} = installLocalStorage());
  });

  test('lưu rồi đọc lại giữ nguyên hình học và có schemaVersion', () => {
    const l = sample();
    saveLayout(l);
    const raw = JSON.parse(store.get('viet-floor-layouts-v1')!);
    expect(raw[0].schemaVersion).toBe(2);
    const back = getSaved();
    expect(back.length).toBe(1);
    expect(back[0].floors.map(f => f.rooms.length)).toEqual(l.floors.map(f => f.rooms.length));
  });

  test('tối đa 20 layout, cái mới nhất đứng đầu', () => {
    for (let i = 0; i < 25; i++) {
      const l = sample(i);
      saveLayout({...l, id: `id-${i}`, name: `L${i}`});
    }
    const saved = getSaved();
    expect(saved.length).toBe(20);
    expect(saved[0].name).toBe('L24');
  });

  test('lưu trùng id thay thế bản cũ thay vì nhân đôi', () => {
    const l = sample();
    saveLayout(l);
    saveLayout({...l, name: 'Đã sửa'});
    const saved = getSaved();
    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe('Đã sửa');
  });

  test('entry hỏng trong localStorage bị loại, không crash', () => {
    const l = sample();
    saveLayout(l);
    const arr = JSON.parse(store.get('viet-floor-layouts-v1')!);
    arr.push({rubbish: true}, 'chuỗi rác', {floors: [{rooms: [{x: 'NaN'}]}]});
    store.set('viet-floor-layouts-v1', JSON.stringify(arr));
    const saved = getSaved();
    expect(saved.length).toBe(1);
  });

  test('JSON tổng thể hỏng → trả mảng rỗng', () => {
    store.set('viet-floor-layouts-v1', '{không phải json');
    expect(getSaved()).toEqual([]);
  });

  test('localStorage đầy (quota) không làm crash', () => {
    const l = sample();
    vi.stubGlobal('localStorage', {
      getItem: () => '[]',
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      }
    });
    expect(() => saveLayout(l)).not.toThrow();
    expect(() => removeSaved('x')).not.toThrow();
  });

  test('removeSaved xóa đúng layout', () => {
    saveLayout({...sample(1), id: 'a', name: 'A'});
    saveLayout({...sample(2), id: 'b', name: 'B'});
    removeSaved('a');
    const saved = getSaved();
    expect(saved.length).toBe(1);
    expect(saved[0].id).toBe('b');
  });
});
