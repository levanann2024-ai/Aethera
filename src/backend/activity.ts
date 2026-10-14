export type ActivityType = 'lookup' | 'ask' | 'pin' | 'learn';
export type Activity = { id: string; type: ActivityType; text: string; detail?: string; at: number };

const KEY = 'aethera.activity';
const LIMIT = 200;

export function getActivities(): Activity[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed)
      ? (parsed as Activity[]).filter((item) => item && typeof item.text === 'string' && typeof item.at === 'number' && typeof item.type === 'string')
      : [];
  } catch {
    return [];
  }
}

export function logActivity(type: ActivityType, text: string, detail?: string) {
  try {
    const entry: Activity = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, type, text, detail, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify([entry, ...getActivities()].slice(0, LIMIT)));
  } catch {
    // Activity is only a convenience; losing an entry is fine.
  }
}

const dayKey = (time: number) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export function weekCounts(activities: Activity[], now = Date.now()): number[] {
  const today = new Date(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const counts = Array<number>(7).fill(0);
  for (const item of activities) {
    const diffDays = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(new Date(item.at).getFullYear(), new Date(item.at).getMonth(), new Date(item.at).getDate()).getTime()) / 86400000);
    const index = mondayOffset - diffDays;
    if (diffDays >= 0 && index >= 0 && index < 7) counts[index] += 1;
  }
  return counts;
}

export function activeStreak(activities: Activity[], now = Date.now()): number {
  const days = new Set(activities.map((item) => dayKey(item.at)));
  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
