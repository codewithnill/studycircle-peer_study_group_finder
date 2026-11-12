// this file gives the seed a "random" number maker that repeats itself.
// the same start number always gives the same list of numbers, so every seed run
// builds the same data. this makes bugs easy to repeat and counts easy to check.
// no imports are needed. this file only uses plain javascript.

// the start number. change it to get a different (but still repeatable) set of demo data.
export const SEED_NUMBER = 20261112;

// a small random number maker. the algorithm is called mulberry32.
export class SeededRandom {
  // the inner counter. every call to next() changes it, so the next number is new.
  private state: number;

  // sets the start number. ">>> 0" turns it into a positive whole number.
  constructor(seed: number = SEED_NUMBER) {
    this.state = seed >>> 0;
  }

  // returns a decimal number from 0 (included) up to 1 (not included).
  next(): number {
    // move the counter forward by a fixed step. ">>> 0" keeps it a positive 32-bit number.
    this.state = (this.state + 0x6d2b79f5) >>> 0;

    // mix the bits of the counter. Math.imul multiplies two 32-bit numbers without overflow surprises.
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    // turn the mixed bits into a decimal between 0 and 1.
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // returns a whole number from min to max. both ends are included.
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  // returns one random item from a list.
  pick<T>(items: readonly T[]): T {
    // an empty list has nothing to pick, so stop with a clear message.
    if (items.length === 0) {
      throw new Error('pick() needs a list with at least one item.');
    }
    // choose a position and return the item there.
    return items[this.int(0, items.length - 1)] as T;
  }

  // returns true with the given chance. 0.25 means about one time in four.
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  // returns a new list with the same items in a random order. the original list is not changed.
  shuffle<T>(items: readonly T[]): T[] {
    // work on a copy, so the caller's list stays the same.
    const copy = [...items];
    // walk from the end to the start and swap each item with a random earlier item.
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  }

  // returns a number of different random items from a list.
  sample<T>(items: readonly T[], count: number): T[] {
    // shuffle first, then take the first few. this never picks the same item twice.
    return this.shuffle(items).slice(0, count);
  }
}