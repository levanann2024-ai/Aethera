import { CalendarDays, Lightbulb, ListChecks, MessageCircle, MessagesSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { lookupPhrase } from '@/backend/api';
import type { PhraseLookup } from '@/types/dictionary';

export type AiModeId = 'explain' | 'plan' | 'quiz' | 'speak' | 'chat';

export type AiMode = {
  id: AiModeId;
  title: string;
  description: string;
  tone: 'mint' | 'sand' | 'lime' | 'sky' | 'peach';
  icon: LucideIcon;
};

export const aiModes: AiMode[] = [
  { id: 'plan', title: 'Lập kế hoạch học', description: 'Chọn số ngày và thời gian, nhận lộ trình để tích từng bước.', tone: 'sand', icon: CalendarDays },  
  { id: 'chat', title: 'Trò chuyện với AI', description: 'Hỏi tự do về từ vựng, bài học và nhận câu trả lời ngay.', tone: 'peach', icon: MessageCircle },
];

export async function bestLookup(text: string): Promise<PhraseLookup> {
  const [tay, muong] = await Promise.all([lookupPhrase('tay', text), lookupPhrase('muong', text)]);
  return muong.matchedTokens > tay.matchedTokens ? muong : tay;
}
