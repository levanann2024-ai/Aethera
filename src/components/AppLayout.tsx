import type { ReactNode } from 'react';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { navItems } from '@/config/navigation';
import type { User } from '@/types/auth';
import type { Page, Route } from '@/types/navigation';
import { useLanguage } from '@/i18n/useLanguage';

export function Sidebar({ activePage, collapsed, onNavigate, onToggle }: { activePage: Page | undefined; collapsed: boolean; onNavigate: (route: Route) => void; onToggle: () => void }) {
  const { t } = useLanguage();
  return <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <div className="sidebar-top"><button className="brand" onClick={() => onNavigate('home')} aria-label={t('Về trang chủ')}><span className="brand-mark"><LeafMark /></span>{!collapsed && <span className="brand-copy"><strong>Aethera</strong></span>}</button><button className="collapse-button" onClick={onToggle} aria-label={t(collapsed ? 'Mở rộng menu' : 'Thu gọn menu')}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div>
    <div className="sidebar-section-label">{t('Không gian học tập')}</div>
    <nav className="main-nav" aria-label={t('Điều hướng chính')}>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${activePage === id ? 'nav-item-active' : ''}`} onClick={() => onNavigate(id)} title={collapsed ? t(label) : undefined} aria-current={activePage === id ? 'page' : undefined}><Icon size={19} strokeWidth={activePage === id ? 2.3 : 1.8} />{!collapsed && <span>{t(label)}</span>}{!collapsed && activePage === id && <span className="nav-pip" />}</button>)}</nav>
    <div className="sidebar-bottom"><button className="nav-item" onClick={() => onNavigate('settings')} title={collapsed ? t('Cài đặt') : undefined}><Settings size={19} strokeWidth={1.8} />{!collapsed && <span>{t('Cài đặt')}</span>}</button><button className={`profile ${collapsed ? 'profile-collapsed' : ''}`} onClick={() => onNavigate('profile')}><div className="avatar">{collapsed ? 'KH' : 'KH'}</div>{!collapsed && <><div className="profile-copy"><strong>{t('Hồ sơ của tôi')}</strong><span>{sessionLabel(t)}</span></div><ChevronDown size={15} /></>}</button></div>
  </aside>;
}

function sessionLabel(t: (text: string) => string) { return t('Tài khoản học tập'); }

export function Header({ user, onNavigate }: { user: User | null; onNavigate: (route: Route) => void }) {
  const { language, setLanguage, t } = useLanguage();
  const email = user?.email ?? 'Khách học tập';
  const initials = email.slice(0, 2).toUpperCase();
  return <header className="topbar"><div className="topbar-actions"><div className="language-switch" aria-label={t('Ngôn ngữ giao diện')}><button className={language === 'vi' ? 'language-switch-active' : ''} onClick={() => setLanguage('vi')} aria-pressed={language === 'vi'}>VI</button><button className={language === 'en' ? 'language-switch-active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button></div><button className="user-chip" onClick={() => onNavigate(user ? 'profile' : 'login')}><span className="avatar avatar-small">{initials}</span><span>{user ? email : t('Đăng nhập')}</span><ChevronDown size={14} /></button></div></header>;
}

export function DataPageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) { const { t } = useLanguage(); return <div className="data-page"><section className="data-page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {t(eyebrow)}</div><h1>{t(title)}</h1><p>{t(description)}</p></div></section>{children}</div>; }

export function LeafMark({ large = false }: { large?: boolean }) {
  return <img className={large ? 'leaf-mark leaf-mark-large' : 'leaf-mark'} src="/aethera-mark.svg" alt="" />;
}
