import { voiceRate } from '@/services/settings';
import { useState } from 'react';
import type { DictionaryEntry } from '@/types/dictionary';

export type ReviewMode = 'flashcard' | 'quiz' | 'listen';

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function speakText(text: string, rate = 1): boolean {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = rate * voiceRate();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function normalizeWord(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

export function buildDeck(entries: DictionaryEntry[], pinned: Set<string>, learned: Set<string>, limit = 8) {
  const pinnedEntries = entries.filter((entry) => pinned.has(entry.id));
  const usePinned = pinnedEntries.length > 0;
  const base = usePinned ? pinnedEntries : entries;
  const deck = [
    ...shuffle(base.filter((entry) => !learned.has(entry.id))),
    ...shuffle(base.filter((entry) => learned.has(entry.id))),
  ].slice(0, limit);
  return { deck: shuffle(deck), usePinned };
}

export function buildOptions(target: DictionaryEntry, pool: DictionaryEntry[], field: 'meaning' | 'sourceTerm', count = 4) {
  const distractors = shuffle(
    Array.from(new Set(pool.filter((entry) => entry.id !== target.id).map((entry) => entry[field]))),
  ).filter((value) => value !== target[field]);
  return shuffle([target[field], ...distractors.slice(0, count - 1)]);
}

export function useReviewRound(initialDeck: DictionaryEntry[]) {
  const [deck, setDeck] = useState(initialDeck);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});

  return {
    deck,
    index,
    entry: deck[index] as DictionaryEntry | undefined,
    finished: index >= deck.length,
    correct: deck.filter((entry) => results[entry.id]).length,
    missed: deck.filter((entry) => results[entry.id] === false),
    record: (id: string, ok: boolean) => setResults((current) => ({ ...current, [id]: ok })),
    next: () => setIndex((current) => current + 1),
    restart: (nextDeck: DictionaryEntry[]) => {
      setDeck(shuffle(nextDeck));
      setIndex(0);
      setResults({});
    },
  };
}
