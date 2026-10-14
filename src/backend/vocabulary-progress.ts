import { useCallback, useRef, useState } from 'react';
import { logActivity } from './activity';
import type { ActivityType } from './activity';

const PINNED_KEY = 'aethera.vocabulary.pinned';
const LEARNED_KEY = 'aethera.vocabulary.learned';

function readSet(key: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, value: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    // Storage can be unavailable (private mode); progress then lives only in memory.
  }
}

function useStoredSet(key: string, activity: ActivityType) {
  const [items, setItems] = useState(() => readSet(key));
  const latest = useRef(items);
  const set = useCallback((id: string, on?: boolean) => {
    const current = latest.current;
    const enable = on ?? !current.has(id);
    if (enable === current.has(id)) return;
    const next = new Set(current);
    if (enable) next.add(id);
    else next.delete(id);
    latest.current = next;
    writeSet(key, next);
    setItems(next);
    if (enable) logActivity(activity, id);
  }, [key, activity]);
  return [items, set] as const;
}

export function useVocabularyProgress() {
  const [pinned, setPinned] = useStoredSet(PINNED_KEY, 'pin');
  const [learned, setLearned] = useStoredSet(LEARNED_KEY, 'learn');
  return { pinned, learned, setPinned, setLearned };
}

export function getPinnedIds(): Set<string> {
  return readSet(PINNED_KEY);
}

export function getLearnedIds(): Set<string> {
  return readSet(LEARNED_KEY);
}
