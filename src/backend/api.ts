import type { User } from '@/types/auth';
import type { DictionaryEntry, PhraseLookup, SourceLanguage } from '@/types/dictionary';
import { sampleDictionaryEntries } from '@/data/sampleDictionary';

// API configuration for Vietnamese-Tay translation
const TAY_API_URL = import.meta.env.VITE_TAY_API_URL || 'https://admin.taynung.com/api/words/trans';

let dictionaryEntries = [...sampleDictionaryEntries];
let activeUser: User | null = null;
let nextEntryId = 1;

// Helper function to create an empty PhraseLookup result
function emptyPhraseLookup(language: SourceLanguage): PhraseLookup { // Returns empty result for no input
  return {
    language,
    segments: [],
    matchedTokens: 0,
    totalTokens: 0,
    coverage: 0,
  };
}

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
  // For Muong language, continue using sample dictionary as requested
  if (language === 'muong') {
    return lookupPhraseMock(language, text);
  }

  // For Tay language, use the API endpoint
  if (language === 'tay') {
    try {
      // Split text into words for translation
      const words = text.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        return emptyPhraseLookup(language);
      }

      // Translate each word using the API
      const segments = await Promise.all(
        words.map(async (word) => {
          try {
            const response = await fetch(TAY_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tay: word }),
            });

            if (!response.ok) {
              const details = await response.text();
              throw new Error(`Translation request failed: HTTP ${response.status}${details ? ` - ${details}` : ''}`);
            }

            const apiResponse = await response.json();

            // Transform API response to PhraseLookup segment format
            if (apiResponse.exact && apiResponse.exact.length > 0) {
              const exactMatch = apiResponse.exact[0];
              return {
                source: exactMatch.source,
                meaning: exactMatch.target,
                partOfSpeech: '', // Not provided in API response
                example: '',      // Not provided in API response
                matched: true,
              };
            } else if (apiResponse.suggestions && apiResponse.suggestions.length > 0) {
              // Use first suggestion if no exact match
              const suggestion = apiResponse.suggestions[0];
              return {
                source: suggestion.tay,
                meaning: suggestion.viet,
                partOfSpeech: '',
                example: '',
                matched: true,
              };
            } else {
              // No translation found
              return {
                source: word,
                meaning: '',
                partOfSpeech: '',
                example: '',
                matched: false,
              };
            }
          } catch (error) {
            console.warn(`Failed to translate word "${word}":`, error);
            // Return unmatched segment on error
            return {
              source: word,
              meaning: '',
              partOfSpeech: '',
              example: '',
              matched: false,
            };
          }
        })
      );

      // Calculate statistics
      const matchedTokens = segments.filter(s => s.matched).length;
      const totalTokens = words.length;

      return {
        language,
        segments,
        matchedTokens,
        totalTokens,
        coverage: totalTokens ? Math.round((matchedTokens / totalTokens) * 100) : 0,
      };
    } catch (error) {
      console.warn('Tay API lookup failed, falling back to mock data:', error);
      return lookupPhraseMock(language, text);
    }
  }

  // Fallback (should not reach here with current SourceLanguage types)
  return lookupPhraseMock(language, text);
}

export async function lookupVietnameseToEthnic(language: SourceLanguage, text: string): Promise<PhraseLookup> {
  // For Muong language, continue using sample dictionary as requested
  if (language === 'muong') {
    return lookupVietnameseToEthnicMock(language, text);
  }

  // For Tay language, use the API endpoint
  if (language === 'tay') {
    try {
      // Split text into words for translation
      const words = text.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        return emptyPhraseLookup(language);
      }

      // Translate each word using the API
      const segments = await Promise.all(
        words.map(async (word) => {
          try {
            const response = await fetch(TAY_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ viet: word }),
            });

            if (!response.ok) {
              const details = await response.text();
              throw new Error(`Translation request failed: HTTP ${response.status}${details ? ` - ${details}` : ''}`);
            }

            const apiResponse = await response.json();

            // Transform API response to PhraseLookup segment format
            if (apiResponse.exact && apiResponse.exact.length > 0) {
              const exactMatch = apiResponse.exact[0];
              return {
                source: exactMatch.source,
                meaning: exactMatch.target,
                partOfSpeech: '', // Not provided in API response
                example: '',      // Not provided in API response
                matched: true,
              };
            } else if (apiResponse.suggestions && apiResponse.suggestions.length > 0) {
              // Use first suggestion if no exact match
              const suggestion = apiResponse.suggestions[0];
              return {
                source: suggestion.viet,
                meaning: suggestion.tay,
                partOfSpeech: '',
                example: '',
                matched: true,
              };
            } else {
              // No translation found
              return {
                source: word,
                meaning: '',
                partOfSpeech: '',
                example: '',
                matched: false,
              };
            }
          } catch (error) {
            console.warn(`Failed to translate word "${word}":`, error);
            // Return unmatched segment on error
            return {
              source: word,
              meaning: '',
              partOfSpeech: '',
              example: '',
              matched: false,
            };
          }
        })
      );

      // Calculate statistics
      const matchedTokens = segments.filter(s => s.matched).length;
      const totalTokens = words.length;

      return {
        language,
        segments,
        matchedTokens,
        totalTokens,
        coverage: totalTokens ? Math.round((matchedTokens / totalTokens) * 100) : 0,
      };
    } catch (error) {
      console.warn('Tay API lookup failed, falling back to mock data:', error);
      return lookupVietnameseToEthnicMock(language, text);
    }
  }

  // Fallback (should not reach here with current SourceLanguage types)
  return lookupVietnameseToEthnicMock(language, text);
}

export async function addDictionaryEntry(entry: Omit<DictionaryEntry, 'id'>): Promise<DictionaryEntry> {
  requireSignedInUser();
  const savedEntry = { ...entry, id: `demo-entry-${nextEntryId++}` };
  dictionaryEntries = [...dictionaryEntries, savedEntry];
  return savedEntry;
}

// Mock implementations for fallback when API is unavailable
async function lookupPhraseMock(language: SourceLanguage, text: string): Promise<PhraseLookup> {
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

async function lookupVietnameseToEthnicMock(language: SourceLanguage, text: string): Promise<PhraseLookup> {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const entries = dictionaryEntries.filter((entry) => entry.sourceLanguage === language);
  const normalize = (value: string) => value
    .toLocaleLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const normalizedTokens = tokens.map(normalize);
  const searchableEntries = entries
    .map((entry) => ({ entry, tokens: entry.meaning.split(/\s+/).map(normalize) }))
    .sort((first, second) => second.tokens.length - first.tokens.length);
  const segments: PhraseLookup['segments'] = [];
  let matchedTokens = 0;

  for (let index = 0; index < tokens.length;) {
    const match = searchableEntries.find(({ tokens: phraseTokens }) => (
      phraseTokens.length > 0 && phraseTokens.every((token, offset) => normalizedTokens[index + offset] === token)
    ));
    if (match) {
      segments.push({
        source: tokens.slice(index, index + match.tokens.length).join(' '),
        meaning: match.entry.sourceTerm,
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

export async function importDictionary(entries: Omit<DictionaryEntry, 'id'>[]): Promise<number> {
  requireSignedInUser();
  const importedEntries = entries.map((entry) => ({
    ...entry,
    id: `demo-entry-${nextEntryId++}`,
  }));
  dictionaryEntries = [...dictionaryEntries, ...importedEntries];
  return importedEntries.length;
}
