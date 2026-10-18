export type SourceLanguage = 'tay' | 'muong';

export type SearchDirection = 'tay-to-viet' | 'viet-to-tay';

export interface VocabularyEntry {
  id: string;
  sourceLanguage: SourceLanguage;
  sourceTerm: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  meanings: VocabularyMeaning[];
}

export interface VocabularyMeaning {
  part_of_speech?: string;
  definitions?: string[];
  example?: string;
}
