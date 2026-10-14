import type { DictionaryEntry, SourceLanguage } from '@/types/dictionary';

export const suggestedVocabulary = [
  { word: 'Nhớ mãi, luôn ghi nhớ', meaning: 'Tiếng dân tộc: Khắc Hoài' },
  { word: 'Cô gái, người con gái', meaning: 'Tiếng dân tộc: Slao' },
  { word: 'Thời điểm hoặc dịp trong năm', meaning: "Tiếng dân tộc: P'mồng" },
  { word: 'Không, chẳng', meaning: 'Tiếng dân tộc: Nỏ' },
] as const;

export const sampleDictionaryEntries: DictionaryEntry[] = (['tay', 'muong'] as const).flatMap(
  (sourceLanguage: SourceLanguage) => suggestedVocabulary.map(({ word, meaning }, index) => ({
    id: `sample-${sourceLanguage}-${index + 1}`,
    sourceLanguage,
    sourceTerm: word,
    meaning,
    partOfSpeech: 'Từ gợi ý',
    example: 'Nghĩa tham khảo; hãy đối chiếu với ngữ cảnh địa phương.',
  })),
);
