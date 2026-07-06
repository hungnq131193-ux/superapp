export type Rng = () => number;

/** PRNG deterministic theo seed để test tái lập được kết quả sinh phương án. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const jitter = (rng: Rng, amp: number) => (rng() - 0.5) * 2 * amp;

export const pick = <T>(rng: Rng, xs: T[]): T => xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];

/** Sinh id theo bộ đếm (không dùng Math.random) để layout deterministic theo seed. */
export function createUid(prefix: string) {
  let n = 0;
  return (kind: string) => `${prefix}-${kind}-${++n}`;
}
