import type {DesignInput, RoomType, ValidationIssue} from '../../types';
import {midArea} from './normalize';
import type {TechnicalCore, Floor1Needs} from './core';
import type {Rng} from './rng';

export interface SpecItem {
  name: string;
  type: RoomType;
  minH: number;
  minW: number;
  prefArea: number;
  priority: number;
  droppable: boolean;
  /** Master suite: khoét WC riêng bám cột ống nước ngay trong dải phòng này. */
  attachWc?: boolean;
}

export interface FloorSpec {
  level: number;
  front: SpecItem[];
  back: SpecItem[];
  coreWc: 'wc' | 'master-wc' | null;
  /** Khoét thêm WC phụ ở góc dải sau (bám cột ống nước) khi còn WC chưa phân bổ. */
  carveWc: boolean;
  balcony: boolean;
}

const SPEC_DEFAULTS: Partial<Record<RoomType, {minH: number; minW: number; priority: number; droppable: boolean}>> = {
  living: {minH: 2.6, minW: 2.6, priority: 6, droppable: false},
  kitchen: {minH: 2.6, minW: 2.4, priority: 6, droppable: false},
  bedroom: {minH: 2.8, minW: 2.4, priority: 7, droppable: false},
  master: {minH: 3, minW: 2.6, priority: 8, droppable: false},
  worship: {minH: 2.2, minW: 2, priority: 5, droppable: false},
  laundry: {minH: 1.6, minW: 1.4, priority: 3, droppable: true},
  storage: {minH: 1.4, minW: 1.2, priority: 2, droppable: true},
  garage: {minH: 2, minW: 2.2, priority: 8, droppable: false}
};

export function spec(input: DesignInput, name: string, type: RoomType): SpecItem {
  const d = SPEC_DEFAULTS[type] || {minH: 1.5, minW: 1.2, priority: 4, droppable: true};
  return {name, type, prefArea: midArea(input, type), ...d};
}

/**
 * Phân bổ phòng theo tầng cho nhà nhiều tầng (nhà ống/nhà phố):
 * tầng 1 = công năng chung, các tầng trên = ngủ; phòng thờ/giặt ưu tiên tầng trên cùng,
 * sát lõi thang để có lối tiếp cận riêng.
 */
export function buildProgram(input: DesignInput, core: TechnicalCore, f1: Floor1Needs, rng: Rng): {specs: FloorSpec[]; notes: ValidationIssue[]} {
  const notes: ValidationIssue[] = [];
  const W = input.plot.width;
  const D = input.plot.depth;
  const floors = input.plot.floors;
  const req = input.requirements;
  const specs: FloorSpec[] = [];
  let wcLeft = req.wcs;

  const floor1: FloorSpec = {
    level: 1,
    front: [],
    back: req.kitchen ? [spec(input, 'Bếp + ăn', 'kitchen')] : [],
    coreWc: wcLeft > 0 ? 'wc' : null,
    carveWc: false,
    balcony: false
  };
  if (floor1.coreWc) wcLeft--;
  specs.push(floor1);
  if (floors === 1) return {specs, notes};

  // Sức chứa mỗi dải: 2 hàng nếu đủ sâu, 2 cột nếu đủ ngang.
  const cols = W >= 4.9 ? 2 : 1;
  const frontH = core.coreY - (req.balcony ? 1 : 0);
  const backH = D - core.coreY - core.coreH - (input.plot.void ? 1.5 : 0);
  const frontCap = (frontH >= 5.6 ? 2 : 1) * cols;
  const backCap = (backH >= 5.6 ? 2 : 1) * cols;

  for (let level = 2; level <= floors; level++) {
    specs.push({
      level,
      front: [],
      back: [],
      coreWc: wcLeft > 0 ? (wcLeft--, 'wc') : null,
      carveWc: false,
      balcony: req.balcony
    });
  }
  const at = (level: number) => specs.find(s => s.level === level)!;
  const top = floors;

  function push(level: number, item: SpecItem, prefer: 'front' | 'back'): boolean {
    const s = at(level);
    const bands: Array<['front' | 'back', SpecItem[], number]> = [
      ['front', s.front, frontCap],
      ['back', s.back, backCap]
    ];
    bands.sort((a, b) => (a[0] === prefer ? -1 : 1) - (b[0] === prefer ? -1 : 1));
    for (const [, list, cap] of bands) {
      if (list.length < cap) {
        list.push(item);
        return true;
      }
    }
    return false;
  }

  if (req.masterSuite) {
    const master = spec(input, 'Phòng ngủ master', 'master');
    master.attachWc = true;
    master.prefArea += midArea(input, 'master-wc');
    master.minW = 2.6 + 1.4;
    push(2, master, 'front');
  }
  if (req.worship && !push(top, spec(input, 'Phòng thờ', 'worship'), 'front')) {
    notes.push({severity: 'warning', message: 'Không còn chỗ cho phòng thờ ở tầng trên cùng, cân nhắc tăng số tầng.'});
  }

  let bedroomsLeft = Math.max(0, req.bedrooms - (req.masterSuite ? 1 : 0));
  let idx = 1;
  let guard = 0;
  while (bedroomsLeft > 0 && guard++ < 60) {
    // Chọn dải còn trống có tỉ lệ lấp đầy thấp nhất để rải phòng ngủ đều các tầng.
    let best: {level: number; band: 'front' | 'back'; fill: number} | null = null;
    for (let level = 2; level <= floors; level++) {
      const s = at(level);
      const options: Array<['front' | 'back', number, number]> = [
        ['front', s.front.length, frontCap],
        ['back', s.back.length, backCap]
      ];
      for (const [band, len, cap] of options) {
        if (len < cap) {
          const fill = len / cap;
          if (!best || fill < best.fill) best = {level, band, fill};
        }
      }
    }
    if (!best) break;
    at(best.level)[best.band].push(spec(input, `Phòng ngủ ${idx++}`, 'bedroom'));
    bedroomsLeft--;
  }
  if (bedroomsLeft > 0) {
    notes.push({severity: 'warning', message: `Không đủ diện tích sàn cho ${bedroomsLeft} phòng ngủ, đã lược bớt. Cân nhắc tăng số tầng hoặc giảm nhu cầu.`});
  }

  if (req.laundry && !push(top, spec(input, 'Giặt phơi / logia', 'laundry'), 'back')) {
    notes.push({severity: 'info', message: 'Không còn chỗ riêng cho khu giặt phơi, có thể tận dụng ban công.'});
  }
  if (req.storage && !push(top, spec(input, 'Kho', 'storage'), 'back')) {
    notes.push({severity: 'info', message: 'Không còn chỗ cho kho chứa đồ, đã lược bớt.'});
  }

  // WC còn dư: khoét vào dải sau của các tầng chưa có WC chung trong lõi.
  for (let level = 2; level <= floors && wcLeft > 0; level++) {
    const s = at(level);
    if (s.coreWc !== 'wc' && s.back.length === 1) {
      s.carveWc = true;
      wcLeft--;
    }
  }

  // Trộn nhẹ thứ tự phòng trong dải theo rng để tạo đa dạng giữa các phương án.
  for (const s of specs) {
    if (s.level > 1 && s.back.length === 2 && rng() < 0.5) s.back.reverse();
  }

  return {specs, notes};
}
