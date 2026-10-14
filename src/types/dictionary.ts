export type SourceLanguage = 'tay' | 'muong';

export type DictionaryEntry = {
  id: string;
  sourceLanguage: SourceLanguage;
  sourceTerm: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
};

export type DictionaryMatch = {
  source: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  matched: boolean;
};

export type PhraseLookup = {
  language: SourceLanguage;
  segments: DictionaryMatch[];
  matchedTokens: number;
  totalTokens: number;
  coverage: number;
};
