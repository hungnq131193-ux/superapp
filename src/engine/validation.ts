import type {DesignInput, Layout, Room, ValidationIssue} from '../types';
import {adjacent, area, inside, intersects} from '../utils/geometry';

const expand = (r: Room, by: number) => ({...r, x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2});

/** Phòng có mặt thoáng: chạm mặt tiền/mặt hậu hoặc kề sân/giếng trời/ban công. */
function hasLight(r: Room, rooms: Room[], depth: number): boolean {
  if (r.y <= 0.15 || r.y + r.height >= depth - 0.15) return true;
  return rooms.some(o => o.id !== r.id && ['yard', 'void', 'balcony'].includes(o.type) && adjacent(r, o, 0.3) );
}

export function validateLayout(layout: Layout, input: DesignInput = layout.input): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const {width, depth} = input.plot;

  for (const floor of layout.floors) {
    let total = 0;
    for (const r of floor.rooms) {
      total += area(r);
      if (!inside(r, width, depth)) {
        issues.push({severity: 'error', message: `${r.name} vượt ranh đất tầng ${floor.level}.`, roomIds: [r.id]});
      }
    }
    if (total > width * depth * 1.02) {
      issues.push({severity: 'error', message: `Tổng diện tích tầng ${floor.level} vượt diện tích sàn.`});
    }
    for (let i = 0; i < floor.rooms.length; i++) {
      for (let j = i + 1; j < floor.rooms.length; j++) {
        if (intersects(floor.rooms[i], floor.rooms[j])) {
          issues.push({severity: 'error', message: `${floor.rooms[i].name} chồng lên ${floor.rooms[j].name} (tầng ${floor.level}).`, roomIds: [floor.rooms[i].id, floor.rooms[j].id]});
        }
      }
    }
    const living = floor.rooms.find(r => r.type === 'living');
    if (living && !input.allowWcNearLiving) {
      for (const wc of floor.rooms.filter(r => r.type === 'wc' || r.type === 'master-wc')) {
        if (intersects(expand(wc, 0.25), living)) {
          issues.push({severity: 'warning', message: 'WC quá gần/phạm vùng phòng khách, nên đổi vị trí kín đáo hơn.', roomIds: [wc.id, living.id]});
        }
      }
    }
    // Mặt thoáng cho phòng ở chính (khách/ngủ): khuyến nghị, không phải lỗi cứng.
    for (const r of floor.rooms.filter(x => ['bedroom', 'master', 'living'].includes(x.type))) {
      const ok = hasLight(r, floor.rooms, depth) || (r.type === 'living' && floor.rooms.some(o => o.type === 'garage' && adjacent(r, o, 0.3)));
      if (!ok) issues.push({severity: 'warning', message: `${r.name} (tầng ${floor.level}) thiếu mặt thoáng, nên bố trí sát mặt tiền/mặt hậu hoặc thêm giếng trời.`, roomIds: [r.id]});
    }
  }

  // Ràng buộc đỗ xe cho đất hẹp: dưới 5.5m không đỗ ô tô ngang được.
  if (input.plot.parking === 'car' && width < 5.5 && input.plot.parkingMode === 'transverse') {
    issues.push({severity: 'error', message: 'Đất ngang dưới 5.5m không đủ chỗ đỗ ô tô ngang, cần chuyển sang đỗ dọc.'});
  }

  // Cầu thang phải đồng trục giữa các tầng.
  if (layout.floors.length > 1) {
    const stairs = layout.floors.map(f => ({level: f.level, stair: f.rooms.find(r => r.type === 'stair')}));
    const missing = stairs.filter(s => !s.stair);
    for (const m of missing) issues.push({severity: 'error', message: `Tầng ${m.level} thiếu cầu thang.`});
    const present = stairs.filter(s => s.stair).map(s => s.stair!) as Room[];
    if (present.length > 1) {
      const ref = present[0];
      const off = present.filter(s => Math.abs(s.x - ref.x) > 0.1 || Math.abs(s.y - ref.y) > 0.1);
      if (off.length > 0) {
        issues.push({severity: 'error', message: 'Cầu thang lệch trục giữa các tầng, cần xếp đồng trục để thi công được.', roomIds: [ref.id, ...off.map(o => o.id)]});
      }
    }
  }

  // WC nên gom về một trục kỹ thuật (trục đứng đường ống).
  const allWcs = layout.floors.flatMap(f => f.rooms.filter(r => r.type === 'wc' || r.type === 'master-wc'));
  if (allWcs.length > 1) {
    const ref = allWcs[0];
    const offAxis = allWcs.filter(w => w.x + w.width < ref.x - 0.75 || w.x > ref.x + ref.width + 0.75);
    if (offAxis.length > 0) {
      issues.push({severity: 'warning', message: 'Có WC lệch trục kỹ thuật, nên gom các WC về một trục đứng để tiết kiệm đường ống.', roomIds: offAxis.map(w => w.id)});
    }
  }

  const master = layout.floors.flatMap(f => f.rooms).find(r => r.type === 'master');
  const mwc = layout.floors.flatMap(f => f.rooms).find(r => r.type === 'master-wc');
  if (input.requirements.masterSuite && (!master || !mwc || master.floor !== mwc.floor || !adjacent(master, mwc, 0.35))) {
    issues.push({severity: 'error', message: 'WC riêng master phải nằm trong hoặc liền kề phòng master.', roomIds: [master?.id || '', mwc?.id || ''].filter(Boolean)});
  }

  // Phòng thờ cần lối tiếp cận riêng (kề thang/hành lang) khi người dùng yêu cầu.
  if (input.requirements.privateWorshipAccess) {
    const worship = layout.floors.flatMap(f => f.rooms).find(r => r.type === 'worship');
    if (worship) {
      const sameFloor = layout.floors.find(f => f.level === worship.floor)?.rooms || [];
      const nearCirculation = sameFloor.some(r => (r.type === 'stair' || r.type === 'corridor') && adjacent(worship, r, 0.35));
      const nearEntry = worship.y <= depth * 0.35; // nhà không thang: gần lối vào
      if (!nearCirculation && !nearEntry) {
        issues.push({severity: 'warning', message: 'Phòng thờ nên có lối tiếp cận riêng qua thang/hành lang, không đi xuyên phòng ngủ.', roomIds: [worship.id]});
      }
    }
  }

  const needed = layout.floors.flatMap(f => f.rooms).reduce((s, r) => s + r.targetArea, 0);
  if (needed > input.plot.width * input.plot.depth * input.plot.floors * 0.92) {
    issues.push({severity: 'warning', message: 'Nhu cầu phòng khá dày so với diện tích, phương án chỉ nên xem như gợi ý.'});
  }
  return issues;
}
