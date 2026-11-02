/** Weeks run Monday to Sunday in the device's local time. */
export function startOfWeek(d: Date): Date {
  const daysSinceMonday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMonday);
}

/** The planning window: this week plus 8 weeks ahead (63 days). `end` is exclusive, at local midnight. */
export function planningWindow(now: Date): { start: Date; end: Date } {
  const start = startOfWeek(now);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 63);
  return { start, end };
}
