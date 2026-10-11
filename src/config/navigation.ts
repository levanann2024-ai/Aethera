import { BookOpen, History, House, Languages, Newspaper, Sparkles, WandSparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Page } from '@/types/navigation';

type NavItem = { id: Page; label: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { id: 'home', label: 'Trang chủ', icon: House },
  { id: 'translate', label: 'Tra từ điển', icon: Languages },
  { id: 'ai-assistant', label: 'Trợ lý AI', icon: WandSparkles },
  { id: 'vocabulary', label: 'Từ vựng', icon: BookOpen },
  { id: 'practice', label: 'Luyện tập', icon: Sparkles },
  { id: 'history', label: 'Lịch sử tra từ', icon: History },
  { id: 'news', label: 'Tin tức', icon: Newspaper },
];
