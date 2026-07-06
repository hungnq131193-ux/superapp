import type {Room, RoomType, ValidationIssue} from '../../types';
import {intersects, round} from '../../utils/geometry';

const PRIORITY: Partial<Record<RoomType, number>> = {
  stair: 10, 'master-wc': 9, wc: 9, garage: 8, master: 8, bedroom: 7,
  kitchen: 6, living: 6, worship: 5, yard: 4, void: 4, laundry: 3,
  balcony: 2, storage: 2, corridor: 1
};

const MIN_DIM: Partial<Record<RoomType, [number, number]>> = {
  wc: [1.1, 1.4], 'master-wc': [1.1, 1.4], bedroom: [2.2, 2.2], master: [2.4, 2.4],
  kitchen: [2, 2], living: [2.2, 2.2], stair: [1.8, 2.2], garage: [2, 1.8],
  worship: [1.8, 1.8], laundry: [1.1, 1.1], storage: [0.9, 0.9], balcony: [1, 0.7],
  corridor: [0.6, 0.6], void: [0.7, 0.7], yard: [1, 0.7]
};

const DROPPABLE = new Set<RoomType>(['storage', 'balcony', 'laundry', 'corridor', 'void', 'yard']);

const prio = (r: Room) => PRIORITY[r.type] ?? 4;
const minDim = (r: Room): [number, number] => MIN_DIM[r.type] ?? [0.8, 0.8];

function clampIntoPlot(r: Room, W: number, D: number): Room {
  const out = {...r};
  out.width = Math.min(out.width, W);
  out.height = Math.min(out.height, D);
  out.x = Math.max(0, Math.min(out.x, W - out.width));
  out.y = Math.max(0, Math.min(out.y, D - out.height));
  return out;
}

/** Thu nhỏ phòng ưu tiên thấp theo trục xâm lấn nhỏ nhất để gỡ chồng lấn. */
function shrinkVictim(victim: Room, other: Room): Room | null {
  const overW = Math.min(victim.x + victim.width, other.x + other.width) - Math.max(victim.x, other.x);
  const overH = Math.min(victim.y + victim.height, other.y + other.height) - Math.max(victim.y, other.y);
  const [minW, minH] = minDim(victim);
  const canX = victim.width - overW >= minW;
  const canY = victim.height - overH >= minH;
  const out = {...victim};
  const shrinkX = () => {
    if (victim.x < other.x) out.width = round(other.x - victim.x, 2);
    else {
      const edge = other.x + other.width;
      out.width = round(victim.x + victim.width - edge, 2);
      out.x = round(edge, 2);
    }
  };
  const shrinkY = () => {
    if (victim.y < other.y) out.height = round(other.y - victim.y, 2);
    else {
      const edge = other.y + other.height;
      out.height = round(victim.y + victim.height - edge, 2);
      out.y = round(edge, 2);
    }
  };
  if (canX && (!canY || overW <= overH)) shrinkX();
  else if (canY) shrinkY();
  else return null;
  return out.width > 0.05 && out.height > 0.05 ? out : null;
}

export interface RepairResult {
  rooms: Room[];
  notes: ValidationIssue[];
  changed: boolean;
}

/**
 * Pass sửa lỗi hình học deterministic: kẹp phòng vào ranh đất rồi gỡ chồng lấn
 * bằng cách thu nhỏ phòng ưu tiên thấp; phòng phụ không gỡ được sẽ bị loại bỏ.
 * Được dùng làm lưới an toàn sau placement và làm chức năng "Tự sửa lỗi" trên UI.
 */
export function repairRooms(rooms: Room[], plotWidth: number, plotDepth: number): RepairResult {
  const notes: ValidationIssue[] = [];
  let out = rooms.map(r => ({...r}));
  let changed = false;

  for (let i = 0; i < out.length; i++) {
    const clamped = clampIntoPlot(out[i], plotWidth, plotDepth);
    if (clamped.x !== out[i].x || clamped.y !== out[i].y || clamped.width !== out[i].width || clamped.height !== out[i].height) {
      out[i] = clamped;
      changed = true;
    }
  }

  // Mỗi vòng gỡ một cặp chồng lấn; số vòng đủ lớn cho mọi tầng thực tế.
  for (let pass = 0; pass < 40; pass++) {
    let collision = false;
    for (let i = 0; i < out.length && !collision; i++) {
      for (let j = i + 1; j < out.length && !collision; j++) {
        const a = out[i];
        const b = out[j];
        if (!intersects(a, b)) continue;
        collision = true;
        const victimIdx = prio(a) < prio(b) || (prio(a) === prio(b) && a.width * a.height >= b.width * b.height) ? i : j;
        const otherIdx = victimIdx === i ? j : i;
        const shrunk = shrinkVictim(out[victimIdx], out[otherIdx]);
        if (shrunk) {
          out[victimIdx] = shrunk;
          changed = true;
        } else if (DROPPABLE.has(out[victimIdx].type)) {
          notes.push({severity: 'warning', message: `Đã bỏ ${out[victimIdx].name} (tầng ${out[victimIdx].floor}) vì không đủ chỗ sau khi sửa chồng lấn.`});
          out = out.filter((_, k) => k !== victimIdx);
          changed = true;
        } else {
          // Không thu nhỏ được phòng chính: để validation báo lỗi cho người dùng chỉnh tay.
          collision = false;
        }
      }
    }
    if (!collision) break;
  }

  out = out.filter(r => r.width > 0.05 && r.height > 0.05);
  return {rooms: out, notes, changed};
}
