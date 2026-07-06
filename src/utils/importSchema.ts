import type {DesignInput, Floor, Layout, Room, RoomType} from '../types';
import {defaultInput} from '../engine/defaults';
import {recomputeLayout} from '../engine';
import {uid} from './geometry';

export const SCHEMA_VERSION = 2;

export type ImportResult = {ok: true; layout: Layout} | {ok: false; errors: string[]};

const ROOM_TYPES: RoomType[] = ['living', 'kitchen', 'bedroom', 'master', 'wc', 'master-wc', 'worship', 'laundry', 'storage', 'balcony', 'garage', 'stair', 'corridor', 'void', 'yard'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v : fallback);

/** Trộn input nhập vào lên input mặc định, chỉ nhận field đúng kiểu — không bao giờ throw. */
function sanitizeInput(raw: unknown): DesignInput {
  const input = structuredClone(defaultInput);
  if (!isObj(raw)) return input;
  if (isObj(raw.plot)) {
    const p = raw.plot;
    if (num(p.width)) input.plot.width = p.width;
    if (num(p.depth)) input.plot.depth = p.depth;
    if (num(p.floors)) input.plot.floors = Math.round(p.floors);
    if (typeof p.frontDirection === 'string') input.plot.frontDirection = p.frontDirection;
    if (typeof p.houseType === 'string') input.plot.houseType = p.houseType as DesignInput['plot']['houseType'];
    for (const k of ['frontYard', 'backYard', 'void'] as const) if (typeof p[k] === 'boolean') input.plot[k] = p[k];
    if (p.parking === 'none' || p.parking === 'motorbike' || p.parking === 'car') input.plot.parking = p.parking;
    if (p.parkingMode === 'auto' || p.parkingMode === 'longitudinal' || p.parkingMode === 'transverse') input.plot.parkingMode = p.parkingMode;
    if (p.stair === 'middle' || p.stair === 'back' || p.stair === 'side' || p.stair === 'auto') input.plot.stair = p.stair;
  }
  if (isObj(raw.requirements)) {
    const r = raw.requirements;
    if (num(r.bedrooms)) input.requirements.bedrooms = Math.round(r.bedrooms);
    if (num(r.wcs)) input.requirements.wcs = Math.round(r.wcs);
    for (const k of ['living', 'kitchen', 'worship', 'laundry', 'storage', 'balcony', 'masterSuite', 'privateWorshipAccess'] as const) {
      if (typeof r[k] === 'boolean') input.requirements[k] = r[k];
    }
    if (typeof r.notes === 'string') input.requirements.notes = r.notes;
  }
  if (isObj(raw.areas)) {
    for (const [k, v] of Object.entries(raw.areas)) {
      if (isObj(v) && num(v.min) && num(v.max)) input.areas[k] = {min: v.min, max: v.max};
    }
  }
  if (typeof (raw as Record<string, unknown>).allowWcNearLiving === 'boolean') input.allowWcNearLiving = raw.allowWcNearLiving as boolean;
  return input;
}

function sanitizeRoom(raw: unknown, floorLevel: number, errors: string[]): Room | null {
  if (!isObj(raw)) {
    errors.push(`Tầng ${floorLevel} chứa phần tử phòng không hợp lệ (không phải đối tượng).`);
    return null;
  }
  const name = str(raw.name, 'Phòng');
  for (const k of ['x', 'y', 'width', 'height'] as const) {
    if (!num(raw[k])) {
      errors.push(`Phòng "${name}" (tầng ${floorLevel}) thiếu hoặc sai tọa độ/kích thước "${k}".`);
      return null;
    }
  }
  const x = raw.x as number, y = raw.y as number, width = raw.width as number, height = raw.height as number;
  if (width <= 0 || height <= 0 || width > 100 || height > 100 || x < -100 || y < -100) {
    errors.push(`Phòng "${name}" (tầng ${floorLevel}) có kích thước không hợp lệ (${width}x${height}).`);
    return null;
  }
  const type: RoomType = ROOM_TYPES.includes(raw.type as RoomType) ? (raw.type as RoomType) : 'storage';
  return {
    id: str(raw.id, uid('room')),
    name,
    type,
    floor: floorLevel,
    x, y, width, height,
    targetArea: num(raw.targetArea) && raw.targetArea > 0 ? raw.targetArea : Math.round(width * height * 10) / 10
  };
}

/** Dựng Layout an toàn từ object bất kỳ; trả null kèm lỗi tiếng Việt nếu dữ liệu hỏng. */
export function sanitizeLayout(raw: unknown, errors: string[]): Layout | null {
  if (!isObj(raw)) {
    errors.push('Dữ liệu không phải một layout hợp lệ (không phải đối tượng JSON).');
    return null;
  }
  const version = num(raw.schemaVersion) ? raw.schemaVersion : 1;
  if (version > SCHEMA_VERSION) {
    errors.push(`Tệp dùng phiên bản dữ liệu ${version}, mới hơn phiên bản app hỗ trợ (${SCHEMA_VERSION}). Hãy cập nhật ứng dụng.`);
    return null;
  }
  if (!Array.isArray(raw.floors) || raw.floors.length === 0) {
    errors.push('Layout thiếu danh sách tầng (floors) hoặc danh sách rỗng.');
    return null;
  }
  const input = sanitizeInput(raw.input);
  if (input.plot.width < 1 || input.plot.width > 50 || input.plot.depth < 1 || input.plot.depth > 100) {
    errors.push(`Kích thước đất không hợp lệ (${input.plot.width}m x ${input.plot.depth}m).`);
    return null;
  }

  const floors: Floor[] = [];
  for (let i = 0; i < raw.floors.length; i++) {
    const f = raw.floors[i];
    if (!isObj(f) || !Array.isArray(f.rooms)) {
      errors.push(`Tầng thứ ${i + 1} thiếu danh sách phòng (rooms).`);
      return null;
    }
    const level = num(f.level) ? Math.round(f.level) : i + 1;
    const rooms: Room[] = [];
    for (const r of f.rooms) {
      const room = sanitizeRoom(r, level, errors);
      if (!room) return null;
      rooms.push(room);
    }
    floors.push({level, rooms});
  }

  const layout: Layout = {
    id: str(raw.id, uid('layout')),
    name: str(raw.name, 'Phương án nhập từ tệp'),
    input,
    floors,
    issues: [],
    score: {total: 0, areaFit: 0, circulation: 0, adjacency: 0, light: 0, technical: 0, explanations: []},
    createdAt: str(raw.createdAt, new Date().toISOString())
  };
  // Không tin issues/score trong tệp: tính lại từ hình học thực tế.
  return recomputeLayout(layout);
}

/** Đọc chuỗi JSON thành Layout; mọi lỗi trả về message tiếng Việt, không bao giờ throw. */
export function parseLayoutJson(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {ok: false, errors: ['Tệp không phải JSON hợp lệ (lỗi cú pháp).']};
  }
  const errors: string[] = [];
  const layout = sanitizeLayout(raw, errors);
  if (!layout) return {ok: false, errors: errors.length ? errors : ['Không đọc được layout từ tệp.']};
  return {ok: true, layout};
}
