export type SourceLanguage = 'tay' | 'muong';

export type DictionaryMeaning = {
  part_of_speech?: string;
  definitions?: string[];
  example?: string;
};

export type DictionaryEntry = {
  id: string;
  sourceLanguage: SourceLanguage;
  sourceTerm: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  meanings?: DictionaryMeaning[];
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
