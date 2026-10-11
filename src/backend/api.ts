import type { User } from '@/types/auth';
import type { DictionaryEntry, PhraseLookup, SourceLanguage } from '@/types/dictionary';
import { sampleDictionaryEntries } from '@/data/sampleDictionary';

let dictionaryEntries = [...sampleDictionaryEntries];
let activeUser: User | null = null;
let nextEntryId = 1;

function createMockUser(email: string, name: string): User {
  return {
    id: `demo-${email.trim().toLowerCase()}`,
    email: email.trim(),
    name: name.trim(),
    preferredLanguage: 'vi',
  };
}

function requireSignedInUser(): User {
  if (!activeUser) throw new Error('Vui lòng đăng nhập để tiếp tục.');
  return activeUser;
}

export async function registerAccount(name: string, email: string, password: string): Promise<User> {
  if (!name.trim() || !email.trim() || !password) throw new Error('Không thể tạo tài khoản.');
  activeUser = createMockUser(email, name);
  return { ...activeUser };
}

export async function loginAccount(email: string, password: string): Promise<User> {
  if (!email.trim() || !password) throw new Error('Email hoặc mật khẩu chưa đúng.');
  const name = email.trim().split('@')[0] || 'Người học demo';
  activeUser = createMockUser(email, name);
  return { ...activeUser };
}

export async function getCurrentUser(): Promise<User | null> {
  return activeUser ? { ...activeUser } : null;
}

export async function logoutAccount(): Promise<void> {
  activeUser = null;
}

export async function savePreferredLanguage(preferredLanguage: string): Promise<User> {
  activeUser = { ...requireSignedInUser(), preferredLanguage };
  return { ...activeUser };
}

export async function searchDictionary(language: SourceLanguage, query = ''): Promise<DictionaryEntry[]> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return dictionaryEntries.filter((entry) => (
    entry.sourceLanguage === language
    && (!normalizedQuery || [
      entry.sourceTerm,
      entry.meaning,
      entry.partOfSpeech,
      entry.example,
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)))
  ));
}

export async function lookupPhrase(language: SourceLanguage, text: string): Promise<PhraseLookup> {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const entries = dictionaryEntries.filter((entry) => entry.sourceLanguage === language);
  const normalize = (value: string) => value
    .toLocaleLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const normalizedTokens = tokens.map(normalize);
  const searchableEntries = entries
    .map((entry) => ({ entry, tokens: entry.sourceTerm.split(/\s+/).map(normalize) }))
    .sort((first, second) => second.tokens.length - first.tokens.length);
  const segments: PhraseLookup['segments'] = [];
  let matchedTokens = 0;

  for (let index = 0; index < tokens.length;) {
    const match = searchableEntries.find(({ tokens: phraseTokens }) => (
      phraseTokens.every((token, offset) => normalizedTokens[index + offset] === token)
    ));
    if (match) {
      segments.push({
        source: tokens.slice(index, index + match.tokens.length).join(' '),
        meaning: match.entry.meaning,
        partOfSpeech: match.entry.partOfSpeech,
        example: match.entry.example,
        matched: true,
      });
      matchedTokens += match.tokens.length;
      index += match.tokens.length;
    } else {
      segments.push({
        source: tokens[index],
        meaning: '',
        partOfSpeech: '',
        example: '',
        matched: false,
      });
      index += 1;
    }
  }

  const totalTokens = tokens.length;

  return {
    language,
    segments,
    matchedTokens,
    totalTokens,
    coverage: totalTokens ? Math.round((matchedTokens / totalTokens) * 100) : 0,
  };
}

export async function addDictionaryEntry(entry: Omit<DictionaryEntry, 'id'>): Promise<DictionaryEntry> {
  requireSignedInUser();
  const savedEntry = { ...entry, id: `demo-entry-${nextEntryId++}` };
  dictionaryEntries = [...dictionaryEntries, savedEntry];
  return savedEntry;
}

export async function importDictionary(entries: Omit<DictionaryEntry, 'id'>[]): Promise<number> {
  requireSignedInUser();
  const importedEntries = entries.map((entry) => ({
    ...entry,
    id: `demo-entry-${nextEntryId++}`,
  }));
  dictionaryEntries = [...dictionaryEntries, ...importedEntries];
  return importedEntries.length;
}
