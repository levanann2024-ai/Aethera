import { searchDictionary } from '@/services/api';
import { suggestedVocabularyByLang } from '@/data/sampleDictionary';
import { bestLookup } from './aiModes';

export type ChatReply = { text: string; chips?: string[] };

const suggestedVocabulary = Object.values(suggestedVocabularyByLang).flat();
const wordChips = suggestedVocabulary.map(({ word }) => word);

export function chatIntro(): ChatReply {
  return {
    text: 'Chào bạn! Mình có thể tra nghĩa từ hoặc câu tiếng dân tộc trong từ điển của ứng dụng. Bạn hãy gõ một từ, hoặc chọn một gợi ý bên dưới nhé.',
    chips: [...wordChips, 'Gợi ý từ để học'],
  };
}

const fillers = /(nghĩa của|nghĩa là gì|là gì|có nghĩa gì|giải thích|dịch|tra từ|tra|từ|câu|cho mình hỏi|mình muốn hỏi|\?)/gi;

export async function chatRespond(input: string): Promise<ChatReply> {
  const text = input.trim();

  if (/^(xin chào|chào|hello|hi|alo)\b/i.test(text)) return chatIntro();

  if (/gợi ý|học từ nào|từ nào/i.test(text)) {
    const list = suggestedVocabulary.map(({ word, meaning }) => `• ${word}: ${meaning}`).join('\n');
    return { text: `Đây là một vài từ để bạn bắt đầu:\n${list}`, chips: wordChips };
  }

  if (/kế hoạch|lộ trình/i.test(text)) {
    return { text: 'Để lập kế hoạch học, bạn bấm “Quay lại” rồi chọn thẻ “Lập kế hoạch học” nhé. Ở đó bạn chọn số ngày và thời gian, mình sẽ tạo lộ trình để bạn tích từng bước.' };
  }

  if (/quiz|kiểm tra|trắc nghiệm|luyện tập/i.test(text)) {
    return { text: 'Bạn bấm “Quay lại” rồi chọn thẻ “Luyện tập & Quiz” để chơi trò nối từ với nghĩa nhé.' };
  }

  if (/thuyết trình|giao tiếp|luyện nói/i.test(text)) {
    return { text: 'Bạn bấm “Quay lại” rồi chọn thẻ “Luyện giao tiếp / Thuyết trình” để vào vai tình huống và luyện nói nhé.' };
  }

  const query = text.replace(fillers, ' ').replace(/\s+/g, ' ').trim() || text;
  const lookup = await bestLookup(query);
  const matched = lookup.segments.filter((segment) => segment.matched);
  if (!matched.length) {
    const entries = await searchDictionary('tay');
    const sample = entries.slice(0, 2).map((entry) => entry.sourceTerm).join(', ');
    return {
      text: `Mình chưa tìm thấy từ nào trong từ điển hiện có. Bạn thử gõ từng từ riêng, ví dụ: ${sample}.`,
      chips: wordChips,
    };
  }

  const missing = lookup.segments.filter((segment) => !segment.matched).map((segment) => segment.source);
  const lines = matched.map((segment) => `• ${segment.source}: ${segment.meaning}`).join('\n');
  const rest = missing.length ? `\n\nChưa có trong từ điển: ${missing.join(', ')}.` : '';
  return {
    text: `Mình giải thích từng từ nhé:\n${lines}${rest}\n\nNghĩa chỉ để tham khảo, bạn hãy hỏi người nói bản ngữ để chắc chắn.`,
    chips: wordChips.filter((word) => !matched.some((segment) => segment.source === word)),
  };
}
