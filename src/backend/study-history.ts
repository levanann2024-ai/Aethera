import type { PhraseLookup, SourceLanguage } from '@/types/dictionary';

export type StudyRecord = {
  id: string;
  language: SourceLanguage;
  source: string;
  segments: PhraseLookup['segments'];
  coverage: number;
  createdAt: string;
};

const historyLimit = 100;

function isStudyMatch(value: unknown): value is StudyRecord['segments'][number] {
  if (typeof value !== 'object' || value === null) return false;
  const segment = value as Record<string, unknown>;
  return (
    typeof segment.source === 'string'
    && typeof segment.meaning === 'string'
    && typeof segment.partOfSpeech === 'string'
    && typeof segment.example === 'string'
    && typeof segment.matched === 'boolean'
  );
}

function isStudyRecord(value: unknown): value is StudyRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string'
    && (record.language === 'tay' || record.language === 'muong')
    && typeof record.source === 'string'
    && Array.isArray(record.segments)
    && record.segments.every(isStudyMatch)
    && typeof record.coverage === 'number'
    && typeof record.createdAt === 'string'
  );
}

function storageKey(userId?: string): string {
  return `kyflow-study-history:${userId ?? 'guest'}`;
}

export function getStudyHistory(userId?: string): StudyRecord[] {
  const saved = window.localStorage.getItem(storageKey(userId));
  if (!saved) return [];

  let records: unknown;
  try {
    records = JSON.parse(saved);
  } catch {
    throw new Error('Lịch sử học tập trong trình duyệt không hợp lệ.');
  }
  if (!Array.isArray(records)) throw new Error('Lịch sử học tập trong trình duyệt không hợp lệ.');
  if (!records.every(isStudyRecord)) throw new Error('Dữ liệu lịch sử học tập trong trình duyệt không hợp lệ.');
  return records;
}

export function addStudyRecord(source: string, result: PhraseLookup, userId?: string): StudyRecord[] {
  const records = getStudyHistory(userId);
  const nextRecord: StudyRecord = {
    id: crypto.randomUUID(),
    language: result.language,
    source,
    segments: result.segments,
    coverage: result.coverage,
    createdAt: new Date().toISOString(),
  };
  const nextRecords = [nextRecord, ...records].slice(0, historyLimit);
  window.localStorage.setItem(storageKey(userId), JSON.stringify(nextRecords));
  return nextRecords;
}

export function removeStudyRecord(id: string, userId?: string): StudyRecord[] {
  const nextRecords = getStudyHistory(userId).filter((record) => record.id !== id);
  window.localStorage.setItem(storageKey(userId), JSON.stringify(nextRecords));
  return nextRecords;
}

export function clearStudyHistory(userId?: string): void {
  window.localStorage.removeItem(storageKey(userId));
}
