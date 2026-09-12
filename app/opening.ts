// Conservative weekly subset of OSM opening_hours. Complex/holiday rules remain unknown.
export function openingIntervals(
  value: string | undefined,
  date?: string,
): [number, number][] | null {
  if (!value) return null;
  if (value === '24/7') return [[-1440, 4320]];
  if (/^(closed|off)$/.test(value)) return [];
  if (!date || !Number.isFinite(Date.parse(date))) return null;
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const rules: { days: number[]; hours: [number, number][] }[] = [];
  for (const part of value.split(';')) {
    const match = part
      .trim()
      .match(
        /^(?:(((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s+)?(off|closed|\d{2}:\d{2}-\d{2}:\d{2}(?:,\s*\d{2}:\d{2}-\d{2}:\d{2})*)$/,
      );
    if (!match) return null;
    const selected: number[] = [];
    for (const range of (match[1] || 'Su-Sa').split(',')) {
      const [a, b = a] = range.split('-');
      let day = days.indexOf(a);
      const last = days.indexOf(b);
      if (day < 0 || last < 0) return null;
      for (let count = 0; count < 7; count++) {
        selected.push(day);
        if (day === last) break;
        day = (day + 1) % 7;
      }
    }
    const hours: [number, number][] = [];
    if (!/^(off|closed)$/.test(match[3]))
      for (const range of match[3].split(',')) {
        const [a, b] = range
          .trim()
          .split('-')
          .map((t) => {
            const [h, m] = t.split(':').map(Number);
            return m < 60 && h <= 48 ? h * 60 + m : NaN;
          });
        if (!Number.isFinite(a) || !Number.isFinite(b) || a >= 1440) return null;
        hours.push([a, b <= a ? b + 1440 : b]);
      }
    rules.push({ days: selected, hours });
  }
  const result: [number, number][] = [];
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
  for (let offset = -1; offset <= 2; offset++) {
    const matching = rules.filter((r) => r.days.includes((weekday + offset + 7) % 7));
    const rule = matching.at(-1);
    if (rule)
      result.push(
        ...rule.hours.map(([a, b]): [number, number] => [a + offset * 1440, b + offset * 1440]),
      );
  }
  return result.sort((a, b) => a[0] - b[0]);
}
