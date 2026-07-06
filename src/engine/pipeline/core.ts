import type {DesignInput, Rect, ValidationIssue} from '../../types';
import {clamp, round} from '../../utils/geometry';
import {midArea} from './normalize';
import type {Rng} from './rng';
import {jitter} from './rng';

/**
 * Lõi kỹ thuật của ngôi nhà: cầu thang + trục WC được tính MỘT lần và đóng dấu
 * cùng tọa độ lên mọi tầng, nhờ đó thang đồng trục và WC gom trục theo cấu trúc.
 */
export interface TechnicalCore {
  hasStair: boolean;
  side: 'left' | 'right';
  coreY: number;
  coreH: number;
  stair: Rect | null;
  /** Cột ống nước: mọi WC phải nằm trong dải x này. */
  wcCol: {x: number; width: number};
  /** Chiều cao mặc định của một phòng WC trong lõi. */
  wcH: number;
}

/** Nhu cầu tối thiểu của dải trước/sau lõi ở tầng 1, đã điều chỉnh khi đất chật. */
export interface Floor1Needs {
  yardH: number;
  garageH: number;
  livingMin: number;
  kitchenMin: number;
  stripH: number;
}

export function garageHeight(input: DesignInput): number {
  if (input.plot.parking === 'car') return input.plot.parkingMode === 'transverse' ? 3.2 : 5.2;
  if (input.plot.parking === 'motorbike') return 2.2;
  return 0;
}

export function planCore(input: DesignInput, rng: Rng): {core: TechnicalCore; f1: Floor1Needs; notes: ValidationIssue[]} {
  const notes: ValidationIssue[] = [];
  const W = input.plot.width;
  const D = input.plot.depth;
  const floors = input.plot.floors;
  const hasStair = floors > 1;

  const side: 'left' | 'right' = input.plot.stair === 'side' ? 'left' : rng() < 0.5 ? 'right' : 'left';

  const stairW = hasStair ? clamp(W * 0.4, 2, 2.4) : 0;
  let coreH = hasStair ? clamp(midArea(input, 'stair') / stairW, 3, 4) : 2.4;
  const wcW = clamp(W - stairW - 0.8, 1.4, 1.8);
  const wcH = 2.2;

  const f1: Floor1Needs = {
    yardH: input.plot.frontYard ? Math.min(2, round(D * 0.12, 1)) : 0,
    garageH: garageHeight(input),
    livingMin: input.requirements.living ? 2.8 : 0,
    kitchenMin: input.requirements.kitchen ? 2.8 : 0,
    stripH: input.plot.void || input.plot.backYard ? 1.5 : 0
  };

  const frac = input.plot.stair === 'back' ? 0.6 : input.plot.stair === 'middle' ? 0.44 : 0.5 + jitter(rng, 0.07);
  let minFront = f1.yardH + f1.garageH + f1.livingMin;
  const upperBandMin = floors > 1 ? 2.6 : 0;
  let maxCoreY = D - coreH - Math.max(f1.kitchenMin + f1.stripH, upperBandMin);

  // Đất chật: nới dần các ràng buộc mềm cho tới khi lõi đặt vừa.
  if (minFront > maxCoreY && hasStair) {
    coreH = 3;
    maxCoreY = D - coreH - Math.max(f1.kitchenMin + f1.stripH, upperBandMin);
  }
  if (minFront > maxCoreY && f1.yardH > 1.2) {
    f1.yardH = 1.2;
    minFront = f1.yardH + f1.garageH + f1.livingMin;
  }
  if (minFront > maxCoreY && f1.stripH > 0 && !input.plot.void) {
    f1.stripH = 0;
    maxCoreY = D - coreH - Math.max(f1.kitchenMin, upperBandMin);
    notes.push({severity: 'info', message: 'Đất ngắn nên đã bỏ sân sau để đủ chỗ cho các phòng chính.'});
  }
  if (minFront > maxCoreY) {
    f1.livingMin = Math.max(2.4, f1.livingMin - 0.4);
    f1.kitchenMin = Math.max(2.4, f1.kitchenMin - 0.4);
    minFront = f1.yardH + f1.garageH + f1.livingMin;
    maxCoreY = D - coreH - Math.max(f1.kitchenMin + f1.stripH, upperBandMin);
  }
  if (minFront > maxCoreY) {
    notes.push({severity: 'warning', message: 'Đất quá chật so với nhu cầu tầng 1, một số phòng sẽ bị thu nhỏ dưới mức khuyến nghị.'});
    maxCoreY = Math.max(minFront, D - coreH - 2);
  }

  const coreY = round(clamp(D * frac, minFront, maxCoreY), 2);
  const stairX = side === 'left' ? 0 : W - stairW;
  const wcX = side === 'left' ? W - wcW : 0;

  const core: TechnicalCore = {
    hasStair,
    side,
    coreY,
    coreH: round(coreH, 2),
    stair: hasStair ? {x: round(stairX, 2), y: coreY, width: round(stairW, 2), height: round(coreH, 2)} : null,
    wcCol: {x: round(wcX, 2), width: round(wcW, 2)},
    wcH
  };
  return {core, f1, notes};
}
