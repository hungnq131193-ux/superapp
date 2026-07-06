import {describe, expect, test} from 'vitest';
import {intersects, inside, adjacent, area} from '../src/utils/geometry';
import {validateLayout} from '../src/engine/validation';
import {scoreLayout} from '../src/engine/scoring';
import {generateLayouts} from '../src/engine/generator';
import {generateCspOrders} from '../src/engine/original-port/cspTree';
import {defaultInput} from '../src/engine/defaults';
import type {Layout, Room} from '../src/types';

function makeRoom(p: Partial<Room>): Room {
  return {id: p.id ?? 'r' + Math.random(), name: p.name ?? 'Phòng', type: p.type ?? 'bedroom', floor: p.floor ?? 1, x: 0, y: 0, width: 2, height: 2, targetArea: 4, ...p};
}

function makeLayout(rooms: Room[], patch: Partial<Layout> = {}): Layout {
  return {
    id: 'l1',
    name: 'Test',
    input: structuredClone(defaultInput),
    floors: [{level: 1, rooms}],
    issues: [],
    score: {total: 0, areaFit: 0, circulation: 0, adjacency: 0, light: 0, technical: 0, explanations: []},
    createdAt: new Date().toISOString(),
    ...patch
  };
}

describe('geometry', () => {
  test('detect overlap', () => {
    expect(intersects({x: 0, y: 0, width: 2, height: 2}, {x: 1, y: 1, width: 2, height: 2})).toBe(true);
    expect(intersects({x: 0, y: 0, width: 2, height: 2}, {x: 2, y: 0, width: 2, height: 2})).toBe(false);
  });
  test('room inside plot', () => {
    expect(inside({x: 0, y: 0, width: 5, height: 18}, 5, 18)).toBe(true);
    expect(inside({x: 4, y: 0, width: 2, height: 2}, 5, 18)).toBe(false);
  });
  test('adjacency and area helpers', () => {
    expect(adjacent({x: 0, y: 0, width: 2, height: 2}, {x: 2, y: 0, width: 2, height: 2}, 0.1)).toBe(true);
    expect(area({x: 0, y: 0, width: 3, height: 2})).toBe(6);
  });
});

describe('validation', () => {
  test('flags overlapping rooms as error', () => {
    const l = makeLayout([
      makeRoom({id: 'a', name: 'A', x: 0, y: 0, width: 3, height: 3}),
      makeRoom({id: 'b', name: 'B', x: 1, y: 1, width: 3, height: 3})
    ]);
    l.input.requirements.masterSuite = false;
    const issues = validateLayout(l);
    expect(issues.some(i => i.severity === 'error' && i.message.includes('chồng'))).toBe(true);
  });
  test('flags out-of-bounds room as error', () => {
    const l = makeLayout([makeRoom({x: 4, y: 0, width: 3, height: 2})]);
    l.input.requirements.masterSuite = false;
    const issues = validateLayout(l);
    expect(issues.some(i => i.severity === 'error' && i.message.includes('vượt ranh'))).toBe(true);
  });
  test('requires master WC adjacent to master when masterSuite on', () => {
    const l = makeLayout([
      makeRoom({id: 'm', type: 'master', x: 0, y: 0, width: 3, height: 3}),
      makeRoom({id: 'w', type: 'master-wc', x: 0, y: 10, width: 1.8, height: 2})
    ]);
    l.input.requirements.masterSuite = true;
    const issues = validateLayout(l);
    expect(issues.some(i => i.severity === 'error' && i.message.includes('master'))).toBe(true);
  });
});

describe('scoring', () => {
  test('layout with errors scores lower than clean layout', () => {
    const clean = makeLayout([makeRoom({x: 0, y: 0, width: 3, height: 3, targetArea: 9})]);
    const dirty = makeLayout([makeRoom({x: 0, y: 0, width: 3, height: 3, targetArea: 9})]);
    dirty.issues = [{severity: 'error', message: 'x'}];
    expect(scoreLayout(dirty).total).toBeLessThan(scoreLayout(clean).total);
  });
});

describe('generator', () => {
  test('generates requested number of candidates sorted by score', () => {
    const layouts = generateLayouts(structuredClone(defaultInput), 10);
    expect(layouts.length).toBe(10);
    for (let i = 1; i < layouts.length; i++) expect(layouts[i - 1].score.total).toBeGreaterThanOrEqual(layouts[i].score.total);
  });
  test('layouts carry floors matching requested floor count', () => {
    const input = structuredClone(defaultInput);
    input.plot.floors = 2;
    const layouts = generateLayouts(input, 5);
    for (const l of layouts) expect(l.floors.length).toBe(2);
  });
});

describe('CSP port', () => {
  test('generateCspOrders returns valid orderings', () => {
    const orders = generateCspOrders(['Garage', 'Lounge Area', 'Kitchen'], undefined, 10);
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) expect(o.length).toBeGreaterThan(0);
  });
});
