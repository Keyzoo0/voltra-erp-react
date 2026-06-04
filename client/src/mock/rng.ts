// Tiny seeded PRNG (mulberry32) so the seed data is deterministic —
// the demo looks identical on every reload.
export function createRng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** integer in [min, max] inclusive */
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    /** float in [min, max) */
    float(min: number, max: number) {
      return next() * (max - min) + min;
    },
    /** true with probability p */
    chance(p: number) {
      return next() < p;
    },
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(next() * arr.length)];
    },
    /** pick n distinct items */
    sample<T>(arr: readonly T[], n: number): T[] {
      const pool = [...arr];
      const out: T[] = [];
      const count = Math.min(n, pool.length);
      for (let i = 0; i < count; i++) {
        out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
      }
      return out;
    },
    shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
