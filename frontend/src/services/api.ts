import type { TargetLanguage, User } from '@/types/auth';
import type { DictionaryEntry, DictionaryMeaning, PhraseLookup, SourceLanguage } from '@/types/dictionary';
import { mainDictionary } from '@/data/mainDictionary';
import { sampleDictionaryEntries } from '@/data/sampleDictionary';

export type TranslationMethod = 'database' | 'external_api' | 'advanced_required' | 'gemini_ai';

export interface TextTranslation {
  translatedText: string;
  method: TranslationMethod;
  meanings?: DictionaryMeaning[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export type ChatLanguage = 'tay' | 'muong' | 'thai' | 'hmong' | 'dao' | 'all';
export type ChatHistoryMessage = { role: 'user' | 'model'; text: string };
export type ChatAudienceId = 'primary' | 'middle' | 'high' | 'community' | 'educator';
export type ChatAudience =
  | { type: 'preset'; id: ChatAudienceId }
  | { type: 'custom'; description: string };

interface TayApiTranslationResponse {
  exact?: Array<{ source?: string; target?: string }>;
  suggestions?: Array<{ tay?: string; viet?: string }>;
}

function isDictionaryEntry(value: unknown): value is DictionaryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === 'string'
    && (entry.sourceLanguage === 'tay' || entry.sourceLanguage === 'muong')
    && typeof entry.sourceTerm === 'string'
    && typeof entry.meaning === 'string'
    && typeof entry.partOfSpeech === 'string'
    && typeof entry.example === 'string'
    && (entry.meanings === undefined || (
      Array.isArray(entry.meanings)
      && entry.meanings.every((meaning: unknown) => {
        if (typeof meaning !== 'object' || meaning === null || Array.isArray(meaning)) return false;
        const group = meaning as Record<string, unknown>;
        return (group.part_of_speech === undefined || typeof group.part_of_speech === 'string')
          && (group.example === undefined || typeof group.example === 'string')
          && (group.definitions === undefined || (
            Array.isArray(group.definitions)
            && group.definitions.every((definition: unknown) => typeof definition === 'string')
          ));
      })
    ));
}

async function fetchDictionaryEntries(
  language: SourceLanguage,
  query: string,
  direction: 'tay-to-viet' | 'viet-to-tay' = 'tay-to-viet',
): Promise<DictionaryEntry[]> {
  const params = new URLSearchParams({ language, q: query, direction });
  const response = await fetch(`${API_BASE_URL}/dictionary?${params}`);
  if (!response.ok) {
    throw new Error(`Dictionary request failed with HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isDictionaryEntry)) {
    throw new Error('Dictionary API returned an invalid response.');
  }
  return payload;
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

  const databaseEntries = await fetchDictionaryEntries(
    sourceLang,
    text.trim(),
    reverseDirection ? 'viet-to-tay' : 'tay-to-viet',
  );
  const databaseMatch = databaseEntries.find((entry) => (
    reverseDirection
      ? entry.meaning.split(';').some((meaning) => normalizeTranslationText(meaning) === normalizedText)
      : normalizeTranslationText(entry.sourceTerm) === normalizedText
  ));
  if (databaseMatch) {
    return {
      translatedText: reverseDirection ? databaseMatch.sourceTerm : databaseMatch.meaning,
      method: 'database',
      meanings: reverseDirection ? undefined : databaseMatch.meanings,
    };
  }

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
const AUTH_TOKEN_KEY = 'aethera.auth.token';

interface CaptchaChallenge {
  captchaToken: string;
  question: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    target_language: TargetLanguage;
  };
}

function isTargetLanguage(value: unknown): value is TargetLanguage {
  return value === 'tay' || value === 'muong' || value === 'hmong' || value === 'dao' || value === 'all';
}

function parseAuthResponse(value: unknown): AuthResponse {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Authentication API returned an invalid response.');
  }
  const response = value as Record<string, unknown>;
  const user = response.user;
  if (
    typeof response.token !== 'string'
    || typeof user !== 'object'
    || user === null
  ) {
    throw new Error('Authentication API returned an invalid response.');
  }
  const userRecord = user as Record<string, unknown>;
  if (
    (typeof userRecord.id !== 'string' && typeof userRecord.id !== 'number')
    || typeof userRecord.email !== 'string'
    || typeof userRecord.full_name !== 'string'
    || !isTargetLanguage(userRecord.target_language)
  ) {
    throw new Error('Authentication API returned an invalid user.');
  }
  return {
    token: response.token,
    user: {
      id: String(userRecord.id),
      email: userRecord.email,
      full_name: userRecord.full_name,
      target_language: userRecord.target_language,
    },
  };
}

function toFrontendUser(user: AuthResponse['user']): User {
  return {
    id: user.id,
    email: user.email,
    name: user.full_name,
    targetLanguage: user.target_language,
    preferredLanguage: user.target_language,
  };
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const payload: unknown = await response.json();
  if (
    typeof payload === 'object'
    && payload !== null
    && 'error' in payload
    && typeof payload.error === 'string'
  ) {
    return new Error(payload.error);
  }
  return new Error(fallback);
}

function saveAuthenticatedSession(response: AuthResponse): User {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
  } catch {
    throw new Error('Không thể lưu phiên đăng nhập trên trình duyệt này.');
  }
  activeUser = toFrontendUser(response.user);
  return { ...activeUser };
}

export async function requestCaptcha(): Promise<CaptchaChallenge> {
  const response = await fetch(`${API_BASE_URL}/auth/captcha`);
  if (!response.ok) throw await responseError(response, 'Không thể tạo CAPTCHA.');
  const challenge: unknown = await response.json();
  if (
    typeof challenge !== 'object'
    || challenge === null
    || !('captchaToken' in challenge)
    || typeof challenge.captchaToken !== 'string'
    || !('question' in challenge)
    || typeof challenge.question !== 'string'
  ) {
    throw new Error('CAPTCHA API returned an invalid challenge.');
  }
  return { captchaToken: challenge.captchaToken, question: challenge.question };
}

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

function requireSignedInUser(): User {
  if (!activeUser) throw new Error('Vui lòng đăng nhập để tiếp tục.');
  return activeUser;
}

export async function registerAccount(
  fullName: string,
  email: string,
  password: string,
  targetLanguage: TargetLanguage,
  captchaToken: string,
  captchaAnswer: string,
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: fullName,
      email,
      password,
      target_language: targetLanguage,
      captchaToken: `${captchaToken}.${captchaAnswer}`,
    }),
  });
  if (!response.ok) throw await responseError(response, 'Không thể tạo tài khoản.');
  return saveAuthenticatedSession(parseAuthResponse(await response.json()));
}

export async function loginAccount(email: string, password: string): Promise<User> {
  if (!email.trim() || !password) throw new Error('Email hoặc mật khẩu chưa đúng.');
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw await responseError(response, 'Email hoặc mật khẩu chưa đúng.');
  return saveAuthenticatedSession(parseAuthResponse(await response.json()));
}

export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    activeUser = null;
    return null;
  }
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    activeUser = null;
    return null;
  }
  if (!response.ok) throw await responseError(response, 'Không thể xác minh phiên đăng nhập.');
  const payload: unknown = await response.json();
  if (typeof payload !== 'object' || payload === null || !('user' in payload)) {
    throw new Error('Authentication API returned an invalid user response.');
  }
  const parsed = parseAuthResponse({ token, user: payload.user });
  activeUser = toFrontendUser(parsed.user);
  return { ...activeUser };
}

export async function logoutAccount(): Promise<void> {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  activeUser = null;
}

export async function savePreferredLanguage(preferredLanguage: TargetLanguage): Promise<User> {
  requireSignedInUser();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error('Vui lòng đăng nhập lại để đổi ngôn ngữ học.');

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target_language: preferredLanguage }),
  });
  if (!response.ok) throw await responseError(response, 'Không thể cập nhật ngôn ngữ học.');

  const payload: unknown = await response.json();
  if (typeof payload !== 'object' || payload === null || !('user' in payload)) {
    throw new Error('Authentication API returned an invalid user response.');
  }
  const updatedUser = parseAuthResponse({ token, user: payload.user }).user;
  activeUser = toFrontendUser(updatedUser);
  return { ...activeUser };
}

export async function searchDictionary(language: SourceLanguage, query = ''): Promise<DictionaryEntry[]> {
  return fetchDictionaryEntries(language, query.trim());
}

export async function sendAIChat(
  message: string,
  language: ChatLanguage,
  audience: ChatAudience,
  history: ChatHistoryMessage[],
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, language, audience, history }),
  });
  if (!response.ok) throw await responseError(response, 'Không thể gửi câu hỏi đến AI.');

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object'
    || payload === null
    || !('response' in payload)
    || typeof payload.response !== 'string'
    || !payload.response.trim()
  ) {
    throw new Error('AI API returned an invalid response.');
  }
  return payload.response.trim();
}

export async function transcribeAudio(
  audio: Blob,
  language: SourceLanguage,
  reverseDirection: boolean,
): Promise<string> {
  if (audio.type !== 'audio/wav' || audio.size <= 44) {
    throw new Error('Bản ghi âm không hợp lệ. Hãy ghi âm lại rồi thử lại.');
  }

  const bytes = new Uint8Array(await audio.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  const response = await fetch(`${API_BASE_URL}/ai/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64: btoa(binary), mimeType: audio.type, language, reverseDirection }),
  });
  if (!response.ok) throw await responseError(response, 'Không thể nhận diện giọng nói lúc này. Vui lòng thử lại.');

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object'
    || payload === null
    || !('transcript' in payload)
    || typeof payload.transcript !== 'string'
  ) {
    throw new Error('Dịch vụ nhận dạng giọng nói trả về dữ liệu không hợp lệ.');
  }
  return payload.transcript.trim();
}

export interface ImageTranslationRegion {
  text: string;
  translation: string;
  box: [number, number, number, number];
  backgroundColor?: string;
  textColor?: string;
}

export interface ImageTranslationResult {
  regions: ImageTranslationRegion[];
  warning?: string;
}

export async function translateImage(
  image: Blob,
  language: SourceLanguage,
  reverseDirection: boolean,
): Promise<ImageTranslationResult> {
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(image.type) || image.size === 0 || image.size > 8 * 1024 * 1024) {
    throw new Error('Ảnh vượt quá dung lượng cho phép hoặc định dạng không được hỗ trợ.');
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  const response = await fetch(`${API_BASE_URL}/ai/image-translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: btoa(binary),
      mimeType: image.type,
      language,
      reverseDirection,
    }),
  });
  if (!response.ok) throw await responseError(response, 'Không thể dịch chữ trong ảnh lúc này. Vui lòng thử lại.');

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object'
    || payload === null
    || !('regions' in payload)
    || !Array.isArray(payload.regions)
    || payload.regions.length > 100
    || ('warning' in payload && payload.warning !== undefined && typeof payload.warning !== 'string')
    || !payload.regions.every((region: unknown) => {
      if (typeof region !== 'object' || region === null || Array.isArray(region)) return false;
      const value = region as Record<string, unknown>;
      return typeof value.text === 'string'
        && value.text.trim().length > 0
        && value.text.length <= 1000
        && typeof value.translation === 'string'
        && value.translation.trim().length > 0
        && value.translation.length <= 1000
        && Array.isArray(value.box)
        && value.box.length === 4
        && value.box.every((coordinate: unknown) => (
          typeof coordinate === 'number' && Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1000
        ))
        && value.box[0] < value.box[2]
        && value.box[1] < value.box[3];
    })
  ) {
    throw new Error('Dịch vụ dịch ảnh trả về dữ liệu không hợp lệ.');
  }

  return {
    regions: payload.regions as ImageTranslationRegion[],
    warning: 'warning' in payload ? payload.warning as string | undefined : undefined,
  };
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
  const response = await fetch(`${API_BASE_URL}/dictionary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_language: entry.sourceLanguage,
      source_term: entry.sourceTerm,
      meaning: entry.meaning,
      part_of_speech: entry.partOfSpeech,
      example: entry.example,
    }),
  });
  if (!response.ok) {
    throw new Error(`Saving vocabulary failed with HTTP ${response.status}.`);
  }

  const savedEntry: unknown = await response.json();
  if (!isDictionaryEntry(savedEntry)) {
    throw new Error('Dictionary API returned an invalid saved entry.');
  }
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