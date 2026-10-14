import { BookMarked, Bot, ClipboardCheck, House, Languages, Mail, Map, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Page } from '@/types/navigation';

type NavItem = { id: Page; label: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { id: 'home', label: 'Trang chủ', icon: House },
  { id: 'translate', label: 'Dịch & Tra từ', icon: Languages },
  { id: 'vocabulary', label: 'Sổ từ vựng', icon: BookMarked },
  { id: 'practice', label: 'Luyện tập', icon: ClipboardCheck },
  { id: 'ai-assistant', label: 'Trợ lý AI', icon: Bot },
  { id: 'cultural-map', label: 'Bản đồ văn hóa', icon: Map },
  { id: 'contact', label: 'Liên hệ & Góp ý', icon: Mail },
];

export const settingsNavItem: NavItem = { id: 'settings', label: 'Cài đặt', icon: Settings };
