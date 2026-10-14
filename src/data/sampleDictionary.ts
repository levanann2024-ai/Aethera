import type { DictionaryEntry, SourceLanguage } from '@/types/dictionary';

export const suggestedVocabulary = [
  { word: 'Khắc Hoài', meaning: 'Nhớ mãi, luôn ghi nhớ.' },
  { word: 'Slao', meaning: 'Cô gái, người con gái.' },
  { word: "P'mồng", meaning: 'Thời điểm hoặc dịp trong năm.' },
  { word: 'Nỏ', meaning: 'Không, chẳng.' },
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
