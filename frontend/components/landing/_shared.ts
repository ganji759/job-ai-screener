// Helpers shared across HERON landing sections.

export function formatScheduledDate(
  offsetDays: number,
  hour: number,
  min: number,
): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const day = d.toLocaleString("en-US", { weekday: "short" });
  const month = d.toLocaleString("en-US", { month: "short" });
  const h12 = ((hour + 11) % 12) + 1;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${day} ${month} ${d.getDate()} · ${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}
