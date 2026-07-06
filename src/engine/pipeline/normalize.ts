import type {DesignInput, ValidationIssue} from '../../types';
import {clamp, round} from '../../utils/geometry';
import {vietnamAreaConfig} from '../defaults';

export interface NormalizedInput {
  input: DesignInput;
  notes: ValidationIssue[];
}

export function midArea(input: DesignInput, key: string): number {
  const r = input.areas[key] || vietnamAreaConfig[key] || {min: 6, max: 12};
  return round((r.min + r.max) / 2);
}

/** Chuẩn hóa input: clamp giá trị, bù cấu hình diện tích thiếu, áp ràng buộc đỗ xe cho đất hẹp. */
export function normalizeInput(raw: DesignInput): NormalizedInput {
  const input = structuredClone(raw);
  const notes: ValidationIssue[] = [];

  input.plot.width = clamp(round(input.plot.width || 5), 3, 30);
  input.plot.depth = clamp(round(input.plot.depth || 15), 4, 40);
  input.plot.floors = clamp(Math.round(input.plot.floors || 1), 1, 6);
  input.requirements.bedrooms = clamp(Math.round(input.requirements.bedrooms || 0), 0, 10);
  input.requirements.wcs = clamp(Math.round(input.requirements.wcs || 0), 0, input.plot.floors * 2);

  for (const key of Object.keys(vietnamAreaConfig)) {
    if (!input.areas[key]) input.areas[key] = {...vietnamAreaConfig[key]};
  }

  if (input.plot.parking === 'car') {
    if (input.plot.width < 5.5) {
      if (input.plot.parkingMode === 'transverse') {
        notes.push({severity: 'info', message: 'Đất ngang dưới 5.5m không đủ đỗ ô tô ngang, đã chuyển gara sang đỗ dọc.'});
      }
      input.plot.parkingMode = 'longitudinal';
    } else if (input.plot.parkingMode === 'auto') {
      input.plot.parkingMode = 'transverse';
    }
  }

  return {input, notes};
}
