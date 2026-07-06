import {describe, expect, test} from 'vitest';
import {generateLayouts} from '../src/engine/pipeline';
import {repairRooms} from '../src/engine/pipeline/repair';
import {normalizeInput} from '../src/engine/pipeline/normalize';
import {applyPreset, presets, defaultInput} from '../src/engine/defaults';
import {intersects, inside} from '../src/utils/geometry';
import type {Layout, Room} from '../src/types';

const SEED = 42;

function geometryOf(l: Layout) {
  return l.floors.map(f => f.rooms.map(r => [r.type, r.x, r.y, r.width, r.height]));
}

function severeErrors(l: Layout) {
  return l.issues.filter(i => i.severity === 'error');
}

describe('pipeline acceptance: 5 preset chuẩn', () => {
  for (const preset of presets) {
    test(`preset "${preset.name}" có ≥10 phương án và ≥1 phương án không lỗi nghiêm trọng`, () => {
      const input = applyPreset(preset);
      const layouts = generateLayouts(input, 12, SEED);
      expect(layouts.length).toBeGreaterThanOrEqual(10);
      const clean = layouts.filter(l => severeErrors(l).length === 0);
      expect(clean.length, `preset ${preset.name}: ${JSON.stringify(layouts[0]?.issues.filter(i => i.severity === 'error'))}`).toBeGreaterThan(0);
      // Phương án tốt nhất (đứng đầu) phải sạch lỗi nghiêm trọng
      expect(severeErrors(layouts[0]).length, layouts[0].issues.map(i => `${i.severity}:${i.message}`).join(' | ')).toBe(0);
    });
  }
});

describe('pipeline: ràng buộc cứng', () => {
  test('phương án tốt nhất không chồng phòng và không vượt ranh', () => {
    for (const preset of presets) {
      const input = applyPreset(preset);
      const best = generateLayouts(input, 12, SEED)[0];
      for (const f of best.floors) {
        for (const r of f.rooms) {
          expect(inside(r, input.plot.width, input.plot.depth), `${preset.name}: ${r.name} vượt ranh`).toBe(true);
        }
        for (let i = 0; i < f.rooms.length; i++) {
          for (let j = i + 1; j < f.rooms.length; j++) {
            expect(intersects(f.rooms[i], f.rooms[j]), `${preset.name}: ${f.rooms[i].name} chồng ${f.rooms[j].name} tầng ${f.level}`).toBe(false);
          }
        }
      }
    }
  });

  test('đất hẹp dưới 5.5m có ô tô: ép đỗ dọc', () => {
    const input = structuredClone(defaultInput);
    input.plot.width = 4.8;
    input.plot.parking = 'car';
    input.plot.parkingMode = 'transverse';
    const {input: norm} = normalizeInput(input);
    expect(norm.plot.parkingMode).toBe('longitudinal');
    const best = generateLayouts(input, 10, SEED)[0];
    const garage = best.floors[0].rooms.find(r => r.type === 'garage');
    expect(garage).toBeTruthy();
    expect(garage!.height).toBeGreaterThanOrEqual(5); // đỗ dọc cần sâu ≥5m
  });

  test('cầu thang đồng trục giữa các tầng', () => {
    const input = applyPreset(presets[0]); // 5x18, 3 tầng
    for (const l of generateLayouts(input, 10, SEED)) {
      const stairs = l.floors.map(f => f.rooms.find(r => r.type === 'stair')!);
      expect(stairs.every(Boolean)).toBe(true);
      for (const s of stairs) {
        expect(Math.abs(s.x - stairs[0].x)).toBeLessThanOrEqual(0.1);
        expect(Math.abs(s.y - stairs[0].y)).toBeLessThanOrEqual(0.1);
      }
    }
  });

  test('WC gom trục kỹ thuật (x-interval giao nhau)', () => {
    const input = applyPreset(presets[0]);
    const best = generateLayouts(input, 10, SEED)[0];
    const wcs = best.floors.flatMap(f => f.rooms.filter(r => r.type === 'wc' || r.type === 'master-wc'));
    expect(wcs.length).toBeGreaterThan(1);
    const ref = wcs[0];
    for (const w of wcs) {
      expect(w.x + w.width >= ref.x - 0.75 && w.x <= ref.x + ref.width + 0.75, 'WC lệch trục').toBe(true);
    }
  });

  test('master-wc nằm trong hoặc sát master', () => {
    for (const preset of presets) {
      const input = applyPreset(preset);
      if (!input.requirements.masterSuite) continue;
      const best = generateLayouts(input, 12, SEED)[0];
      expect(best.issues.some(i => i.message.includes('WC riêng master')), `${preset.name} vi phạm master-wc`).toBe(false);
    }
  });

  test('phòng thờ có lối riêng khi bật yêu cầu', () => {
    const input = applyPreset(presets[0]);
    input.requirements.worship = true;
    input.requirements.privateWorshipAccess = true;
    const best = generateLayouts(input, 12, SEED)[0];
    const worship = best.floors.flatMap(f => f.rooms).find(r => r.type === 'worship');
    expect(worship).toBeTruthy();
    expect(best.issues.some(i => i.message.includes('Phòng thờ'))).toBe(false);
  });
});

describe('pipeline: determinism & sắp xếp', () => {
  test('cùng seed cho cùng kết quả hình học', () => {
    const input = applyPreset(presets[1]);
    const a = generateLayouts(input, 10, SEED);
    const b = generateLayouts(input, 10, SEED);
    expect(geometryOf(a[0])).toEqual(geometryOf(b[0]));
    expect(a.map(l => l.score.total)).toEqual(b.map(l => l.score.total));
  });

  test('kết quả xếp theo điểm giảm dần', () => {
    const layouts = generateLayouts(applyPreset(presets[3]), 12, SEED);
    for (let i = 1; i < layouts.length; i++) {
      expect(layouts[i - 1].score.total).toBeGreaterThanOrEqual(layouts[i].score.total);
    }
  });
});

describe('repair pass', () => {
  const mk = (p: Partial<Room>): Room => ({id: p.id ?? 'r', name: p.name ?? 'X', type: p.type ?? 'bedroom', floor: 1, x: 0, y: 0, width: 2, height: 2, targetArea: 4, ...p});

  test('kẹp phòng vượt ranh vào trong đất', () => {
    const {rooms} = repairRooms([mk({x: 4, y: 0, width: 3, height: 2})], 5, 18);
    expect(inside(rooms[0], 5, 18)).toBe(true);
  });

  test('gỡ chồng lấn bằng cách thu nhỏ phòng ưu tiên thấp', () => {
    const a = mk({id: 'stair', type: 'stair', x: 0, y: 0, width: 2.2, height: 3.5});
    const b = mk({id: 'store', type: 'storage', x: 1, y: 0, width: 3, height: 3});
    const {rooms} = repairRooms([a, b], 6, 15);
    const stair = rooms.find(r => r.id === 'stair')!;
    const store = rooms.find(r => r.id === 'store');
    expect(stair.width).toBeCloseTo(2.2);
    if (store) expect(intersects(stair, store)).toBe(false);
  });
});
