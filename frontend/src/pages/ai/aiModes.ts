import { CalendarDays, MessageCircle, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { lookupPhrase } from '@/services/api';
import type { PhraseLookup } from '@/types/dictionary';

export type AiModeId = 'explain' | 'plan' | 'quiz' | 'speak' | 'chat' | 'subtitles';

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
  { id: 'subtitles', title: 'Phụ Đề', description: 'Chọn video, AI tạo phụ đề song ngữ Tày – Việt chạy theo lời thoại.', tone: 'sky', icon: Video },
];

export async function bestLookup(text: string): Promise<PhraseLookup> {
  const [tay, muong] = await Promise.all([lookupPhrase('tay', text), lookupPhrase('muong', text)]);
  return muong.matchedTokens > tay.matchedTokens ? muong : tay;
}
