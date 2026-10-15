import type { User } from '@/types/auth';
import type { DictionaryEntry, PhraseLookup, SourceLanguage } from '@/types/dictionary';
import { mainDictionary } from '@/data/mainDictionary';
import { sampleDictionaryEntries } from '@/data/sampleDictionary';

export type TranslationMethod = 'database' | 'external_api' | 'advanced_required' | 'gemini_ai';

export interface TextTranslation {
  translatedText: string;
  method: TranslationMethod;
}

interface TayApiTranslationResponse {
  exact?: Array<{ source?: string; target?: string }>;
  suggestions?: Array<{ tay?: string; viet?: string }>;
}

function normalizeTranslationText(text: string): string {
  return text
    .trim()
    .toLocaleLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .replace(/\s+/g, ' ');
}

export async function translateText(
  text: string,
  sourceLang: SourceLanguage,
  reverseDirection = false,
  useAdvancedTranslation = false,
): Promise<TextTranslation> {
  const normalizedText = normalizeTranslationText(text);
  if (!normalizedText) return { translatedText: '', method: 'database' };

  const wordCount = normalizedText.split(/\s+/).length;
  const entries = Object.entries(mainDictionary[sourceLang] ?? {});
  const dictionaryMatch = reverseDirection
    ? entries.find(([source]) => normalizeTranslationText(source) === normalizedText)
    : entries.find(([, translation]) => (
      translation.split(',').some((candidate) => normalizeTranslationText(candidate) === normalizedText)
    ));
  if (dictionaryMatch) {
    return {
      translatedText: reverseDirection ? dictionaryMatch[1] : dictionaryMatch[0],
      method: 'database',
    };
  }

  if (useAdvancedTranslation) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      translatedText: '[AI Mock] Hệ thống sẽ dịch đoạn văn này khi kết nối backend.',
      method: 'gemini_ai',
    };
  }

  if (wordCount >= 20 || sourceLang !== 'tay') {
    return { translatedText: '', method: 'advanced_required' };
  }

  if (sourceLang === 'tay') {
    try {
      const response = await fetch(TAY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reverseDirection ? { viet: text.trim() } : { tay: text.trim() }),
      });
      if (!response.ok) {
        throw new Error(`Tày translation API request failed with HTTP ${response.status}.`);
      }

      const payload: unknown = await response.json();
      if (payload && typeof payload === 'object') {
        const apiResult = payload as TayApiTranslationResponse;
        const exact = apiResult.exact?.[0];
        const suggestion = apiResult.suggestions?.[0];
        const translatedText = reverseDirection
          ? exact?.target || suggestion?.tay
          : exact?.target || suggestion?.viet;
        if (translatedText?.trim()) {
          return { translatedText: translatedText.trim(), method: 'external_api' };
        }
      }
      return { translatedText: '', method: 'advanced_required' };
    } catch (error) {
      console.warn('Tày translation API failed; advanced translation is available.', error);
      return { translatedText: '', method: 'advanced_required' };
    }
  }

  return { translatedText: '', method: 'advanced_required' };
}

// API configuration for Vietnamese-Tay translation
const TAY_API_URL = import.meta.env.VITE_TAY_API_URL || 'https://admin.taynung.com/api/words/trans';

let dictionaryEntries = [...sampleDictionaryEntries];
let activeUser: User | null = null;
let nextEntryId = 1;

// Helper function to create an empty PhraseLookup result
function emptyPhraseLookup(language: SourceLanguage): PhraseLookup {
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

// ==========================================
// 1. LOOKUP PHRASE (Tày -> Việt) - 3 BƯỚC
// ==========================================
export async function lookupPhrase(language: SourceLanguage, text: string): Promise<PhraseLookup> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return emptyPhraseLookup(language);
  }

  const normalizedText = normalizeTranslationText(trimmedText);
  const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;

  // Đối với ngôn ngữ Mường, sử dụng mock/từ điển mẫu
  if (language === 'muong') {
    return lookupPhraseMock(language, text);
  }

  if (language === 'tay') {
    // BƯỚC 1: Tra từ điển nội bộ (mainDictionary) trước
    if (mainDictionary && mainDictionary[language]) {
      const langDict = mainDictionary[language];
      const entries = Object.entries(langDict);
      const directMatch = entries.find(([source]) => normalizeTranslationText(source) === normalizedText);
      
      if (directMatch) {
        return {
          language,
          segments: [{
            source: trimmedText,
            meaning: directMatch[1],
            partOfSpeech: '',
            example: '',
            matched: true,
          }],
          matchedTokens: 1,
          totalTokens: 1,
          coverage: 100,
        };
      }
    }

    // BƯỚC 2: Nếu không có trong từ điển nội bộ nhưng dưới 20 từ, gọi trực tiếp API của taynung.com
    if (wordCount < 20) {
      try {
        const response = await fetch(TAY_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tay: trimmedText }),
        });

        if (response.ok) {
          const apiResponse = await response.json();
          if (apiResponse.exact && apiResponse.exact.length > 0) {
            const exactMatch = apiResponse.exact[0];
            return {
              language,
              segments: [{
                source: exactMatch.source || trimmedText,
                meaning: exactMatch.target,
                partOfSpeech: '',
                example: '',
                matched: true,
              }],
              matchedTokens: 1,
              totalTokens: 1,
              coverage: 100,
            };
          } else if (apiResponse.suggestions && apiResponse.suggestions.length > 0) {
            const suggestion = apiResponse.suggestions[0];
            return {
              language,
              segments: [{
                source: suggestion.tay || trimmedText,
                meaning: suggestion.viet,
                partOfSpeech: '',
                example: '',
                matched: true,
              }],
              matchedTokens: 1,
              totalTokens: 1,
              coverage: 100,
            };
          }
        }
      } catch (error) {
        console.warn('Tay API lookup failed:', error);
      }
    }

    // BƯỚC 3: Nếu trên 20 từ hoặc không tìm thấy/lỗi API -> Nhảy vào nhánh Mock AI / Fallback
    if (wordCount >= 20) {
      console.log('Văn bản trên 20 từ, chuyển sang nhánh Mock AI (Gemini)...');
    }
    return lookupPhraseMock(language, text);
  }

  return lookupPhraseMock(language, text);
}

// ==========================================
// 2. LOOKUP VIETNAMESE TO ETHNIC (Việt -> Tày) - 3 BƯỚC
// ==========================================
export async function lookupVietnameseToEthnic(language: SourceLanguage, text: string): Promise<PhraseLookup> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return emptyPhraseLookup(language);
  }

  const normalizedText = normalizeTranslationText(trimmedText);
  const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;

  if (language === 'muong') {
    return lookupVietnameseToEthnicMock(language, text);
  }

  if (language === 'tay') {
    // BƯỚC 1: Tra từ điển nội bộ (mainDictionary) trước (tìm theo nghĩa tiếng Việt)
    if (mainDictionary && mainDictionary[language]) {
      const langDict = mainDictionary[language];
      const entries = Object.entries(langDict);
      const reverseMatch = entries.find(([, translation]) =>
        translation.split(',').some((candidate) => normalizeTranslationText(candidate) === normalizedText)
      );

      if (reverseMatch) {
        return {
          language,
          segments: [{
            source: trimmedText,
            meaning: reverseMatch[0], // Từ tiếng Tày gốc
            partOfSpeech: '',
            example: '',
            matched: true,
          }],
          matchedTokens: 1,
          totalTokens: 1,
          coverage: 100,
        };
      }
    }

    // BƯỚC 2: Nếu không có trong từ điển nội bộ nhưng dưới 20 từ, gọi trực tiếp API của taynung.com
    if (wordCount < 20) {
      try {
        const response = await fetch(TAY_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viet: trimmedText }),
        });

        if (response.ok) {
          const apiResponse = await response.json();
          if (apiResponse.exact && apiResponse.exact.length > 0) {
            const exactMatch = apiResponse.exact[0];
            return {
              language,
              segments: [{
                source: exactMatch.source || trimmedText,
                meaning: exactMatch.target,
                partOfSpeech: '',
                example: '',
                matched: true,
              }],
              matchedTokens: 1,
              totalTokens: 1,
              coverage: 100,
            };
          } else if (apiResponse.suggestions && apiResponse.suggestions.length > 0) {
            const suggestion = apiResponse.suggestions[0];
            return {
              language,
              segments: [{
                source: suggestion.viet || trimmedText,
                meaning: suggestion.tay,
                partOfSpeech: '',
                example: '',
                matched: true,
              }],
              matchedTokens: 1,
              totalTokens: 1,
              coverage: 100,
            };
          }
        }
      } catch (error) {
        console.warn('Tay API lookup failed:', error);
      }
    }

    // BƯỚC 3: Nếu trên 20 từ hoặc lỗi API -> Nhảy vào nhánh Mock AI / Fallback
    if (wordCount >= 20) {
      console.log('Văn bản trên 20 từ, chuyển sang nhánh Mock AI (Gemini)...');
    }
    return lookupVietnameseToEthnicMock(language, text);
  }

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