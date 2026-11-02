let counter = 0;

/** A unique id: time, a per-session counter and randomness. Good enough for one person's data. */
export function newId(): string {
  counter = (counter + 1) % 1296;
  return Date.now().toString(36) + counter.toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 8);
}
