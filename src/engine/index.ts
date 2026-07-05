import type {Layout} from '../types';
import {validateLayout} from './validation';
import {scoreLayout} from './scoring';

/** Trả về bản sao layout với issues + score được tính lại, không mutate đầu vào. */
export function recomputeLayout(layout: Layout): Layout {
  const next: Layout = {...layout, floors: layout.floors.map(f => ({...f, rooms: f.rooms.map(r => ({...r}))}))};
  next.issues = validateLayout(next);
  next.score = scoreLayout(next);
  return next;
}
