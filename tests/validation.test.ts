import {describe, expect, test} from 'vitest';
import {validateLayout} from '../src/engine/validation';
import {scoreLayout} from '../src/engine/scoring';
import {defaultInput} from '../src/engine/defaults';
import type {Layout, Room} from '../src/types';

let n = 0;
const mk = (p: Partial<Room>): Room => ({
  id: p.id ?? `r${++n}`, name: p.name ?? 'Phòng', type: p.type ?? 'bedroom', floor: p.floor ?? 1,
  x: 0, y: 0, width: 2, height: 2, targetArea: 4, ...p
});

function layoutOf(floors: Room[][], patchInput: (i: Layout['input']) => void = () => {}): Layout {
  const input = structuredClone(defaultInput);
  input.requirements.masterSuite = false;
  input.requirements.worship = false;
  input.requirements.privateWorshipAccess = false;
  patchInput(input);
  return {
    id: 'l', name: 'T', input,
    floors: floors.map((rooms, i) => ({level: i + 1, rooms})),
    issues: [], score: {total: 0, areaFit: 0, circulation: 0, adjacency: 0, light: 0, technical: 0, explanations: []},
    createdAt: new Date().toISOString()
  };
}

const errs = (l: Layout) => validateLayout(l).filter(i => i.severity === 'error').map(i => i.message);
const warns = (l: Layout) => validateLayout(l).filter(i => i.severity === 'warning').map(i => i.message);

describe('validation: từng ràng buộc cứng', () => {
  test('chồng phòng → error; tách rời → không', () => {
    const bad = layoutOf([[mk({x: 0, y: 0, width: 3, height: 3}), mk({x: 2, y: 2, width: 3, height: 3})]], i => {i.plot.floors = 1;});
    expect(errs(bad).some(m => m.includes('chồng'))).toBe(true);
    const good = layoutOf([[mk({x: 0, y: 0, width: 3, height: 3}), mk({x: 3, y: 0, width: 2, height: 3})]], i => {i.plot.floors = 1;});
    expect(errs(good).some(m => m.includes('chồng'))).toBe(false);
  });

  test('vượt ranh đất → error', () => {
    const bad = layoutOf([[mk({x: 3.5, y: 0, width: 3, height: 2})]], i => {i.plot.width = 5; i.plot.floors = 1;});
    expect(errs(bad).some(m => m.includes('vượt ranh'))).toBe(true);
  });

  test('cầu thang lệch trục giữa các tầng → error; đồng trục → không', () => {
    const stairA = () => mk({type: 'stair', x: 3, y: 8, width: 2, height: 3.4});
    const bad = layoutOf([[stairA()], [mk({type: 'stair', x: 0, y: 8, width: 2, height: 3.4})]], i => {i.plot.floors = 2;});
    expect(errs(bad).some(m => m.includes('lệch trục'))).toBe(true);
    const good = layoutOf([[stairA()], [stairA()]], i => {i.plot.floors = 2;});
    expect(errs(good).some(m => m.includes('lệch trục'))).toBe(false);
  });

  test('tầng thiếu cầu thang → error', () => {
    const bad = layoutOf([[mk({type: 'stair', x: 3, y: 8, width: 2, height: 3.4})], [mk({type: 'bedroom', x: 0, y: 0, width: 3, height: 3})]], i => {i.plot.floors = 2;});
    expect(errs(bad).some(m => m.includes('thiếu cầu thang'))).toBe(true);
  });

  test('WC lệch trục kỹ thuật → warning', () => {
    const bad = layoutOf(
      [[mk({type: 'wc', x: 0, y: 8, width: 1.7, height: 2})], [mk({type: 'stair', x: 3, y: 8, width: 2, height: 3.4}), mk({type: 'wc', x: 3.3, y: 12, width: 1.7, height: 2})]],
      i => {i.plot.floors = 2;}
    );
    // thiếu stair tầng 1 cũng ra error, nhưng ở đây chỉ soi warning trục WC
    expect(warns(bad).some(m => m.includes('trục kỹ thuật'))).toBe(true);
  });

  test('đất <5.5m + ô tô đỗ ngang → error', () => {
    const bad = layoutOf([[mk({})]], i => {
      i.plot.width = 4.5; i.plot.floors = 1; i.plot.parking = 'car'; i.plot.parkingMode = 'transverse';
    });
    expect(errs(bad).some(m => m.includes('5.5m'))).toBe(true);
  });

  test('master-wc xa master → error; liền kề → không', () => {
    const apart = layoutOf(
      [[mk({type: 'master', x: 0, y: 0, width: 3, height: 3}), mk({type: 'master-wc', x: 0, y: 10, width: 1.6, height: 2})]],
      i => {i.plot.floors = 1; i.requirements.masterSuite = true;}
    );
    expect(errs(apart).some(m => m.includes('master'))).toBe(true);
    const adjacent = layoutOf(
      [[mk({type: 'master', x: 0, y: 0, width: 3, height: 3}), mk({type: 'master-wc', x: 3, y: 0, width: 1.6, height: 2})]],
      i => {i.plot.floors = 1; i.requirements.masterSuite = true;}
    );
    expect(errs(adjacent).some(m => m.includes('master'))).toBe(false);
  });

  test('phòng thờ không kề thang/hành lang và xa lối vào → warning', () => {
    const bad = layoutOf(
      [[mk({type: 'worship', x: 0, y: 14, width: 2.5, height: 2.5})]],
      i => {i.plot.floors = 1; i.plot.depth = 18; i.requirements.privateWorshipAccess = true;}
    );
    expect(warns(bad).some(m => m.includes('Phòng thờ'))).toBe(true);
    const good = layoutOf(
      [[mk({type: 'worship', x: 0, y: 14, width: 2.5, height: 2.5}), mk({type: 'corridor', x: 2.5, y: 14, width: 1, height: 2.5})]],
      i => {i.plot.floors = 1; i.plot.depth = 18; i.requirements.privateWorshipAccess = true;}
    );
    expect(warns(good).some(m => m.includes('Phòng thờ'))).toBe(false);
  });

  test('phòng ngủ kẹt giữa nhà không mặt thoáng → warning; sát mặt tiền → không', () => {
    const mid = layoutOf([[mk({type: 'bedroom', x: 1, y: 8, width: 3, height: 3})]], i => {i.plot.depth = 18; i.plot.floors = 1;});
    expect(warns(mid).some(m => m.includes('mặt thoáng'))).toBe(true);
    const front = layoutOf([[mk({type: 'bedroom', x: 1, y: 0, width: 3, height: 3})]], i => {i.plot.depth = 18; i.plot.floors = 1;});
    expect(warns(front).some(m => m.includes('mặt thoáng'))).toBe(false);
  });
});

describe('scoring phạt lỗi', () => {
  test('mỗi error kéo điểm xuống mạnh hơn warning', () => {
    const base = layoutOf([[mk({x: 0, y: 0, width: 3, height: 3, targetArea: 9})]], i => {i.plot.floors = 1;});
    const withWarn = {...base, issues: [{severity: 'warning' as const, message: 'w'}]};
    const withErr = {...base, issues: [{severity: 'error' as const, message: 'e'}]};
    const clean = scoreLayout({...base, issues: []});
    expect(scoreLayout(withWarn).total).toBeLessThan(clean.total);
    expect(scoreLayout(withErr).total).toBeLessThan(scoreLayout(withWarn).total);
  });
});
