import { suggestedVocabularyByLang } from '@/data/sampleDictionary';

export type ChatReply = { text: string; chips?: string[] };

const suggestedVocabulary = Object.values(suggestedVocabularyByLang).flat();
const wordChips = suggestedVocabulary.map(({ word }) => word);

export function chatIntro(): ChatReply {
  return {
    text: 'Chào bạn! Mình có thể tra nghĩa từ hoặc câu tiếng dân tộc trong từ điển của ứng dụng. Bạn hãy gõ một từ, hoặc chọn một gợi ý bên dưới nhé.',
    chips: [...wordChips, 'Gợi ý từ để học'],
  };
}
