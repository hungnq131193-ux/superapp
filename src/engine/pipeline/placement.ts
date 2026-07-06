import type {DesignInput, Rect, Room, RoomType, ValidationIssue} from '../../types';
import {clamp, round} from '../../utils/geometry';
import {midArea} from './normalize';
import type {Floor1Needs, TechnicalCore} from './core';
import type {FloorSpec, SpecItem} from './program';
import type {Rng} from './rng';
import {jitter} from './rng';

type Uid = (kind: string) => string;
type Notes = ValidationIssue[];

const WC_W = 1.7;
const WC_H = 1.9;
const MWC_W = 1.6;

function mkRoom(uidf: Uid, name: string, type: RoomType, floor: number, x: number, y: number, w: number, h: number, targetArea?: number): Room {
  return {
    id: uidf('room'),
    name,
    type,
    floor,
    x: round(x, 2),
    y: round(y, 2),
    width: round(w, 2),
    height: round(h, 2),
    targetArea: targetArea ?? round(w * h, 1)
  };
}

/** Chia tổng chiều sâu cho các hàng: khởi đầu từ min, nở dần theo tỉ lệ tới cap. */
function distribute(mins: number[], caps: number[], total: number): number[] {
  const h = [...mins];
  let leftover = total - h.reduce((a, b) => a + b, 0);
  for (let pass = 0; pass < 4 && leftover > 0.01; pass++) {
    const growth = h.map((v, i) => Math.max(0, caps[i] - v));
    const sum = growth.reduce((a, b) => a + b, 0);
    if (sum <= 0.01) break;
    for (let i = 0; i < h.length; i++) h[i] += Math.min(growth[i], (leftover * growth[i]) / sum);
    leftover = total - h.reduce((a, b) => a + b, 0);
  }
  return h;
}

interface Row {
  specs: SpecItem[];
  minH: number;
  prefH: number;
}

function rowOf(specs: SpecItem[], width: number): Row {
  const pref = specs.reduce((s, x) => s + x.prefArea, 0) / Math.max(1, width);
  const minH = Math.max(...specs.map(s => s.minH));
  return {specs, minH, prefH: Math.max(minH, pref)};
}

/**
 * Lấp một dải (band) bằng danh sách phòng: ghép cặp cạnh nhau khi đủ ngang,
 * xếp chồng theo chiều sâu, tự lược phòng ưu tiên thấp khi dải quá chật.
 */
export function fillBand(
  input: DesignInput,
  band: Rect,
  specs: SpecItem[],
  level: number,
  core: TechnicalCore,
  coreSide: 'top' | 'bottom',
  carveWc: boolean,
  uidf: Uid,
  notes: Notes
): Room[] {
  const rooms: Room[] = [];
  if (band.height < 0.8 || band.width < 0.8) return rooms;

  let list = [...specs];
  const mkRows = (ls: SpecItem[]): Row[] => {
    const rows: Row[] = [];
    for (let i = 0; i < ls.length; i++) {
      const a = ls[i];
      const b = ls[i + 1];
      if (!a.attachWc && b && !b.attachWc && band.width >= a.minW + b.minW) {
        rows.push(rowOf([a, b], band.width));
        i++;
      } else {
        rows.push(rowOf([a], band.width));
      }
    }
    return rows;
  };

  let rows = mkRows(list);
  while (rows.length > 0 && rows.reduce((s, r) => s + r.minH, 0) > band.height + 1e-6) {
    if (list.length === 1) break; // một phòng duy nhất: chấp nhận chật, validation sẽ cảnh báo
    const victim = [...list].sort((a, b) => (Number(b.droppable) - Number(a.droppable)) || a.priority - b.priority)[0];
    list = list.filter(s => s !== victim);
    notes.push({severity: 'warning', message: `Tầng ${level} không đủ chỗ cho ${victim.name}, đã lược bớt.`});
    rows = mkRows(list);
  }
  if (rows.length === 0) return rooms;

  const mins = rows.map(r => Math.min(r.minH, band.height));
  const caps = rows.map(r => Math.max(r.minH, Math.min(band.height, r.prefH * 1.6)));
  let heights = distribute(mins, caps, band.height);
  let used = heights.reduce((a, b) => a + b, 0);
  let fillerH = band.height - used;
  if (fillerH < 2.2) {
    heights = heights.map(h => (h * band.height) / used);
    fillerH = 0;
  }

  let y = band.y;
  rows.forEach((row, ri) => {
    const h = heights[ri];
    if (row.specs.length === 2) {
      const [a, b] = row.specs;
      const wa = clamp((band.width * a.prefArea) / (a.prefArea + b.prefArea), a.minW, band.width - b.minW);
      rooms.push(mkRoom(uidf, a.name, a.type, level, band.x, y, wa, h, a.prefArea));
      rooms.push(mkRoom(uidf, b.name, b.type, level, band.x + wa, y, band.width - wa, h, b.prefArea));
    } else {
      const s = row.specs[0];
      const wcOnLeft = core.wcCol.x < band.x + band.width / 2;
      if (s.attachWc) {
        // WC master khoét trong dải phòng master, bám cột ống nước.
        const mw = clamp(band.width - 2.4, 1.2, MWC_W);
        const mh = Math.min(2.4, h);
        const wcX = wcOnLeft ? band.x : band.x + band.width - mw;
        const wcY = coreSide === 'bottom' ? y + h - mh : y;
        rooms.push(mkRoom(uidf, s.name, 'master', level, wcOnLeft ? band.x + mw : band.x, y, band.width - mw, h, s.prefArea - midArea(input, 'master-wc')));
        rooms.push(mkRoom(uidf, 'WC master', 'master-wc', level, wcX, wcY, mw, mh, midArea(input, 'master-wc')));
      } else if (ri === 0 && carveWc && band.width - WC_W >= s.minW) {
        // WC chung khoét ở góc dải, sát lõi kỹ thuật.
        const wcY = coreSide === 'top' ? y : y + h - WC_H;
        const wcX = wcOnLeft ? band.x : band.x + band.width - WC_W;
        rooms.push(mkRoom(uidf, 'WC chung', 'wc', level, wcX, wcY, WC_W, Math.min(WC_H, h), midArea(input, 'wc')));
        rooms.push(mkRoom(uidf, s.name, s.type, level, wcOnLeft ? band.x + WC_W : band.x, y, band.width - WC_W, h, s.prefArea));
      } else {
        rooms.push(mkRoom(uidf, s.name, s.type, level, band.x, y, band.width, h, s.prefArea));
      }
    }
    y += h;
  });
  if (fillerH >= 2.2) {
    rooms.push(mkRoom(uidf, 'Phòng đa năng', 'storage', level, band.x, y, band.width, fillerH));
  }
  return rooms;
}

function coreRooms(input: DesignInput, level: number, core: TechnicalCore, coreWc: 'wc' | 'master-wc' | null, uidf: Uid): Room[] {
  const rooms: Room[] = [];
  if (!core.stair) return rooms;
  rooms.push(mkRoom(uidf, level === 1 ? 'Cầu thang + sảnh' : 'Cầu thang + hành lang', 'stair', level, core.stair.x, core.coreY, core.stair.width, core.coreH, midArea(input, 'stair')));
  if (coreWc) {
    const name = coreWc === 'master-wc' ? 'WC master' : 'WC chung';
    rooms.push(mkRoom(uidf, name, coreWc, level, core.wcCol.x, core.coreY + core.coreH - core.wcH, core.wcCol.width, core.wcH, midArea(input, coreWc)));
  }
  const corW = input.plot.width - core.stair.width - core.wcCol.width;
  if (corW >= 0.7) {
    const corX = core.side === 'left' ? core.stair.width : core.wcCol.width;
    rooms.push(mkRoom(uidf, 'Hành lang', 'corridor', level, corX, core.coreY, corW, core.coreH, midArea(input, 'corridor')));
  }
  return rooms;
}

/** Dựng một tầng của nhà nhiều tầng theo cấu trúc dải: trước lõi / lõi / sau lõi / dải thoáng. */
export function placeFloor(
  input: DesignInput,
  fspec: FloorSpec,
  core: TechnicalCore,
  f1: Floor1Needs,
  uidf: Uid,
  notes: Notes
): Room[] {
  const W = input.plot.width;
  const D = input.plot.depth;
  const level = fspec.level;
  const rooms: Room[] = [];
  let y = 0;

  if (level === 1) {
    if (f1.yardH > 0) {
      rooms.push(mkRoom(uidf, 'Sân trước', 'yard', level, 0, 0, W, f1.yardH, midArea(input, 'yard')));
      y += f1.yardH;
    }
    if (f1.garageH > 0) {
      const name = input.plot.parking === 'car' ? `Gara ô tô (đỗ ${input.plot.parkingMode === 'transverse' ? 'ngang' : 'dọc'})` : 'Sảnh để xe máy';
      rooms.push(mkRoom(uidf, name, 'garage', level, 0, y, W, f1.garageH, midArea(input, 'garage')));
      y += f1.garageH;
    }
    const frontSpecs = [...fspec.front];
    if (input.requirements.living) frontSpecs.unshift({name: 'Phòng khách', type: 'living', minH: 2.4, minW: 2.6, prefArea: midArea(input, 'living'), priority: 6, droppable: false});
    rooms.push(...fillBand(input, {x: 0, y, width: W, height: core.coreY - y}, frontSpecs, level, core, 'bottom', false, uidf, notes));
  } else {
    if (fspec.balcony) {
      rooms.push(mkRoom(uidf, 'Ban công', 'balcony', level, 0, 0, W, 1, midArea(input, 'balcony')));
      y += 1;
    }
    rooms.push(...fillBand(input, {x: 0, y, width: W, height: core.coreY - y}, fspec.front, level, core, 'bottom', false, uidf, notes));
  }

  rooms.push(...coreRooms(input, level, core, fspec.coreWc, uidf));

  const stripH = level === 1 ? f1.stripH : input.plot.void ? 1.5 : 0;
  const backY = core.coreY + core.coreH;
  rooms.push(...fillBand(input, {x: 0, y: backY, width: W, height: D - stripH - backY}, fspec.back, level, core, 'top', fspec.carveWc, uidf, notes));

  if (stripH > 0) {
    const name = level > 1 ? 'Giếng trời' : input.plot.void ? 'Giếng trời / sân sau' : 'Sân sau';
    rooms.push(mkRoom(uidf, name, 'void', level, 0, D - stripH, W, stripH, midArea(input, 'void')));
  }
  return rooms;
}

interface ColItem {
  kind: 'plain' | 'wcrow' | 'bedwc' | 'masterrow';
  spec: SpecItem;
  fixedH?: number;
}

/** Xếp một cột phòng theo chiều sâu; innerRight = cột ống nước nằm ở mép phải của cột. */
function stackColumn(
  input: DesignInput,
  x: number,
  y0: number,
  colW: number,
  totalH: number,
  items: ColItem[],
  innerRight: boolean,
  uidf: Uid,
  notes: Notes,
  onOverflow?: (item: ColItem) => boolean
): Room[] {
  const rooms: Room[] = [];
  let list = [...items];
  const minOf = (it: ColItem) => it.fixedH ?? it.spec.minH;

  while (list.length > 0 && list.reduce((s, it) => s + minOf(it), 0) > totalH + 1e-6) {
    const sorted = [...list].sort((a, b) => (Number(b.spec.droppable) - Number(a.spec.droppable)) || a.spec.priority - b.spec.priority);
    const victim = sorted[0];
    list = list.filter(it => it !== victim);
    if (onOverflow && onOverflow(victim)) continue; // đã chuyển được sang cột khác
    notes.push({severity: 'warning', message: `Không đủ chỗ cho ${victim.spec.name}, đã lược bớt.`});
  }
  if (list.length === 0) return rooms;

  const mins = list.map(minOf);
  const caps = list.map(it => it.fixedH ?? Math.max(it.spec.minH, Math.min(totalH, (it.spec.prefArea / colW) * 1.6)));
  let heights = distribute(mins, caps, totalH);
  const used = heights.reduce((a, b) => a + b, 0);
  let fillerH = totalH - used;
  if (fillerH < 2.2) {
    const grow = list.map((it, i) => (it.fixedH ? 0 : 1));
    const growable = heights.reduce((s, h, i) => s + h * grow[i], 0);
    if (growable > 0) heights = heights.map((h, i) => (grow[i] ? h + (fillerH * h) / growable : h));
    fillerH = 0;
  }

  let y = y0;
  list.forEach((it, i) => {
    const h = heights[i];
    const s = it.spec;
    const innerX = innerRight ? x + colW - WC_W : x;
    if (it.kind === 'plain') {
      rooms.push(mkRoom(uidf, s.name, s.type, 1, x, y, colW, h, s.prefArea));
    } else if (it.kind === 'wcrow') {
      rooms.push(mkRoom(uidf, 'WC chung', 'wc', 1, innerX, y, WC_W, Math.min(WC_H, h), midArea(input, 'wc')));
      rooms.push(mkRoom(uidf, 'Hành lang', 'corridor', 1, innerRight ? x : x + WC_W, y, colW - WC_W, h, midArea(input, 'corridor')));
    } else if (it.kind === 'bedwc') {
      rooms.push(mkRoom(uidf, 'WC chung', 'wc', 1, innerX, y, WC_W, Math.min(WC_H, h), midArea(input, 'wc')));
      rooms.push(mkRoom(uidf, s.name, s.type, 1, innerRight ? x : x + WC_W, y, colW - WC_W, h, s.prefArea));
    } else {
      const mw = clamp(colW - 2.4, 1.2, MWC_W);
      const wx = innerRight ? x + colW - mw : x;
      rooms.push(mkRoom(uidf, 'WC master', 'master-wc', 1, wx, y, mw, Math.min(2.4, h), midArea(input, 'master-wc')));
      rooms.push(mkRoom(uidf, s.name, 'master', 1, innerRight ? x : x + mw, y, colW - mw, h, s.prefArea));
    }
    y += h;
  });
  if (fillerH >= 2.2) rooms.push(mkRoom(uidf, 'Phòng đa năng', 'storage', 1, x, y, colW, fillerH));
  return rooms;
}

/** Nhà 1 tầng: bố cục 2 cột (rộng ≥5.6m) hoặc 1 cột dồn dải (đất hẹp). */
export function placeSingleFloorHouse(input: DesignInput, rng: Rng, uidf: Uid, notes: Notes): Room[] {
  const W = input.plot.width;
  const D = input.plot.depth;
  const req = input.requirements;
  const rooms: Room[] = [];
  const yardH = input.plot.frontYard && D >= 12 ? 1.2 : 0;
  if (input.plot.frontYard && yardH === 0) {
    notes.push({severity: 'info', message: 'Đất ngắn nên đã bỏ sân trước để đủ chỗ cho các phòng chính.'});
  }
  if (yardH > 0) rooms.push(mkRoom(uidf, 'Sân trước', 'yard', 1, 0, 0, W, yardH, midArea(input, 'yard')));
  const H = D - yardH;

  const mk = (name: string, type: RoomType, minH: number, minW: number, priority: number, droppable = false): SpecItem =>
    ({name, type, minH, minW, prefArea: midArea(input, type), priority, droppable});

  const garageH = input.plot.parking === 'car' ? (input.plot.parkingMode === 'transverse' ? 3.2 : 5.2) : input.plot.parking === 'motorbike' ? 2 : 0;
  const garageName = input.plot.parking === 'car' ? `Gara ô tô (đỗ ${input.plot.parkingMode === 'transverse' ? 'ngang' : 'dọc'})` : 'Sảnh để xe máy';
  const regularBeds = Math.max(0, req.bedrooms - (req.masterSuite ? 1 : 0));

  if (W >= 5.6) {
    // Hai cột: trái = sinh hoạt chung, phải = khối ngủ; trục WC bám mép trong cột phải.
    const leftW = clamp(W * (0.5 + jitter(rng, 0.05)), 3, W - 3.4);
    const leftItems: ColItem[] = [];
    if (garageH > 0) leftItems.push({kind: 'plain', spec: mk(garageName, 'garage', garageH, 2.2, 8), fixedH: garageH});
    if (req.living) leftItems.push({kind: 'plain', spec: mk('Phòng khách', 'living', 2.6, 2.6, 6)});
    if (req.kitchen) leftItems.push({kind: 'plain', spec: mk('Bếp + ăn', 'kitchen', 2.6, 2.4, 6)});

    const rightItems: ColItem[] = [];
    if (req.worship) rightItems.push({kind: 'plain', spec: mk('Phòng thờ', 'worship', 2.2, 2, 5)});
    for (let i = 1; i <= regularBeds; i++) {
      const isLast = i === regularBeds;
      const bed = mk(`Phòng ngủ ${i}`, 'bedroom', 2.8, 2.4, 7);
      if (isLast && req.wcs > 0) rightItems.push({kind: 'bedwc', spec: bed});
      else rightItems.push({kind: 'plain', spec: bed});
    }
    if (regularBeds === 0 && req.wcs > 0) rightItems.push({kind: 'wcrow', spec: mk('Hành lang', 'corridor', WC_H, 1, 9), fixedH: WC_H});
    if (req.masterSuite) rightItems.push({kind: 'masterrow', spec: mk('Phòng ngủ master', 'master', 3, 2.6, 8)});
    if (req.laundry) rightItems.push({kind: 'plain', spec: mk('Giặt phơi', 'laundry', 1.6, 1.4, 3, true)});
    if (req.storage) rightItems.push({kind: 'plain', spec: mk('Kho', 'storage', 1.4, 1.2, 2, true)});

    // Phòng ngủ tràn cột phải sẽ được chuyển sang cuối cột trái nếu còn chỗ.
    const moved: ColItem[] = [];
    const leftMin = () => leftItems.concat(moved).reduce((s, it) => s + (it.fixedH ?? it.spec.minH), 0);
    rooms.push(
      ...stackColumn(input, leftW, yardH, W - leftW, H, rightItems, false, uidf, notes, victim => {
        if (victim.spec.type === 'bedroom' && H - leftMin() >= victim.spec.minH) {
          moved.push({kind: 'plain', spec: victim.spec});
          return true;
        }
        return false;
      })
    );
    rooms.push(...stackColumn(input, 0, yardH, leftW, H, [...leftItems, ...moved], true, uidf, notes));
  } else {
    // Đất hẹp: một cột duy nhất, dồn dải từ trước ra sau.
    const items: ColItem[] = [];
    if (garageH > 0) items.push({kind: 'plain', spec: mk(garageName, 'garage', garageH, 2.2, 8), fixedH: garageH});
    if (req.living) items.push({kind: 'plain', spec: mk('Phòng khách', 'living', 2.6, 2.6, 6)});
    if (req.wcs > 0) items.push({kind: 'wcrow', spec: mk('Hành lang', 'corridor', WC_H, 1, 9), fixedH: WC_H});
    if (req.kitchen) items.push({kind: 'plain', spec: mk('Bếp + ăn', 'kitchen', 2.6, 2.4, 6)});
    if (req.worship) items.push({kind: 'plain', spec: mk('Phòng thờ', 'worship', 2.2, 2, 5)});
    for (let i = 1; i <= regularBeds; i++) items.push({kind: 'plain', spec: mk(`Phòng ngủ ${i}`, 'bedroom', 2.8, 2.4, 7)});
    if (req.masterSuite) items.push({kind: 'masterrow', spec: mk('Phòng ngủ master', 'master', 3, 2.6, 8)});
    if (req.laundry) items.push({kind: 'plain', spec: mk('Giặt phơi', 'laundry', 1.6, 1.4, 3, true)});
    if (req.storage) items.push({kind: 'plain', spec: mk('Kho', 'storage', 1.4, 1.2, 2, true)});
    rooms.push(...stackColumn(input, 0, yardH, W, H, items, true, uidf, notes));
  }
  return rooms;
}
