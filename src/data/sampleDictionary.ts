import type { DictionaryEntry, SourceLanguage } from '@/types/dictionary';

// 1. Tách biệt từ vựng gợi ý theo từng ngôn ngữ để tránh trùng lặp dữ liệu sai
export const suggestedVocabularyByLang: Record<SourceLanguage, Array<{ word: string; meaning: string }>> = {
  tay: [
    { word: 'Nhớ mãi, luôn ghi nhớ', meaning: 'Khắc Hoài' },
    { word: 'Cô gái, người con gái', meaning: 'Slao' },
    { word: 'Thời điểm hoặc dịp trong năm', meaning: "P'mồng" },
    { word: 'Không, chẳng', meaning: 'Nỏ' },
    { word: 'Bàn bạc, tính toán', meaning: 'An' }, // Thêm từ "An" chúng mình vừa sửa nè
  ],
  muong: [
    { word: 'Bố, cha', meaning: 'Bác' },
    { word: 'Ăn cơm', meaning: 'Khả kháo' },
    { word: 'Đi đâu đấy', meaning: 'Đi chín dạ' },
  ]
};

// 2. Tự động map dữ liệu sang format DictionaryEntry chuẩn của hệ thống
export const sampleDictionaryEntries: DictionaryEntry[] = (['tay', 'muong'] as const).flatMap(
  (sourceLanguage: SourceLanguage) => {
    const vocabList = suggestedVocabularyByLang[sourceLanguage] || [];
    return vocabList.map(({ word, meaning }, index) => ({
      id: `sample-${sourceLanguage}-${index + 1}`,
      sourceLanguage,
      sourceTerm: word,
      meaning: `Tiếng dân tộc: ${meaning}`,
      partOfSpeech: 'Từ gợi ý',
      example: 'Nghĩa tham khảo; hãy đối chiếu với ngữ cảnh địa phương.',
    }));
  }
);
