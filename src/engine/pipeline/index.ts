import type {DesignInput, Floor, Layout, ValidationIssue} from '../../types';
import {validateLayout} from '../validation';
import {scoreLayout} from '../scoring';
import {generateCspOrders} from '../original-port/cspTree';
import {normalizeInput} from './normalize';
import {planCore} from './core';
import {buildProgram} from './program';
import {placeFloor, placeSingleFloorHouse} from './placement';
import {repairRooms} from './repair';
import {createUid, mulberry32} from './rng';

export {repairRooms} from './repair';
export {normalizeInput} from './normalize';

function cspSeed(input: DesignInput): string[][] {
  const names = ['Garage', 'Lounge Area', 'Kitchen'];
  if (input.requirements.masterSuite) names.push('Master Bedroom (with bathroom)');
  if (input.requirements.wcs) names.push('Bathroom');
  if (input.requirements.balcony) names.push('Balcony');
  return generateCspOrders(names, undefined, 50);
}

function dedupe(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter(i => {
    const key = `${i.severity}|${i.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Pipeline sinh phương án: normalize → lõi kỹ thuật → chương trình phòng theo tầng
 * → placement → repair → validate + chấm điểm. Deterministic theo seed.
 */
export function generateLayouts(rawInput: DesignInput, count = 10, seed?: number): Layout[] {
  const baseSeed = (seed ?? Date.now()) >>> 0;
  const {input, notes: normNotes} = normalizeInput(rawInput);
  const orders = cspSeed(input);
  const candidates: Layout[] = [];
  const total = count + 4; // sinh dư rồi giữ những phương án điểm cao nhất

  for (let v = 0; v < total; v++) {
    const rng = mulberry32(baseSeed + v * 7919);
    const uidf = createUid(`p${baseSeed.toString(36)}v${v}`);
    const notes: ValidationIssue[] = [...normNotes];

    const {core, f1, notes: coreNotes} = planCore(input, rng);
    notes.push(...coreNotes);

    const floors: Floor[] = [];
    if (input.plot.floors === 1) {
      const rooms = placeSingleFloorHouse(input, rng, uidf, notes);
      const repaired = repairRooms(rooms, input.plot.width, input.plot.depth);
      notes.push(...repaired.notes);
      floors.push({level: 1, rooms: repaired.rooms});
    } else {
      const {specs, notes: progNotes} = buildProgram(input, core, f1, rng);
      notes.push(...progNotes);
      for (const fspec of specs) {
        const rooms = placeFloor(input, fspec, core, f1, uidf, notes);
        const repaired = repairRooms(rooms, input.plot.width, input.plot.depth);
        notes.push(...repaired.notes);
        floors.push({level: fspec.level, rooms: repaired.rooms});
      }
    }

    const order = orders[v % Math.max(1, orders.length)] || [];
    const layout: Layout = {
      id: uidf('layout'),
      name: `Phương án ${v + 1}`,
      input: structuredClone(input),
      floors,
      issues: [],
      score: {total: 0, areaFit: 0, circulation: 0, adjacency: 0, light: 0, technical: 0, explanations: []},
      createdAt: new Date().toISOString()
    };
    layout.issues = dedupe([...notes, ...validateLayout(layout, input)]);
    layout.score = scoreLayout(layout);
    if (order.length) layout.name += ` · CSP ${order[0]}`;
    candidates.push(layout);
  }

  const best = candidates.sort((a, b) => b.score.total - a.score.total).slice(0, count);
  return best.map((l, i) => ({...l, name: l.name.replace(/^Phương án \d+/, `Phương án ${i + 1}`)}));
}
