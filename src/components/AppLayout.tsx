import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, LogIn, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { navItems, settingsNavItem } from '@/config/navigation';
import type { User } from '@/types/auth';
import type { Page, Route } from '@/types/navigation';
import { useLanguage } from '@/i18n/useLanguage';

export function Sidebar({ activePage, collapsed, onNavigate, onToggle }: { activePage: Page | undefined; collapsed: boolean; onNavigate: (route: Route) => void; onToggle: () => void }) {
  const { t } = useLanguage();
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const updateScrollButtons = () => {
    const nav = navRef.current;
    if (!nav) return;
    setCanScrollLeft(nav.scrollLeft > 0);
    setCanScrollRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
  };

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    updateScrollButtons();
    nav.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      nav.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const activeItem = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !activeItem) return;
    const navBounds = nav.getBoundingClientRect();
    const itemBounds = activeItem.getBoundingClientRect();
    if (itemBounds.left < navBounds.left) nav.scrollBy({ left: itemBounds.left - navBounds.left, behavior: 'smooth' });
    else if (itemBounds.right > navBounds.right) nav.scrollBy({ left: itemBounds.right - navBounds.right, behavior: 'smooth' });
  }, [activePage]);

  const scrollNav = (direction: -1 | 1) => {
    navRef.current?.scrollBy({ left: direction * 176, behavior: 'smooth' });
  };

  const renderItem = ({ id, label, icon: Icon }: (typeof navItems)[number]) => {
    const active = activePage === id;
    return (
      <button
        key={id}
        className={`nav-item ${active ? 'nav-item-active' : ''}`}
        onClick={() => onNavigate(id)}
        title={collapsed ? t(label) : undefined}
        aria-label={collapsed ? t(label) : undefined}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
        {!collapsed && <span>{t(label)}</span>}
        {active && <span className="active-pill" aria-hidden="true" />}
      </button>
    );
  };
  return <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <div className="sidebar-top"><button className="brand" onClick={() => onNavigate('home')} aria-label={t('Về trang chủ')}><span className="brand-mark"><LeafMark /></span>{!collapsed && <span className="brand-copy"><strong>Aethera</strong></span>}</button><button className="collapse-button" onClick={onToggle} aria-label={t(collapsed ? 'Mở rộng menu' : 'Thu gọn menu')}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div>
    <button className="mobile-nav-arrow" type="button" onClick={() => scrollNav(-1)} disabled={!canScrollLeft} aria-label={t('Điều hướng trước')}><ChevronLeft size={19} /></button>
    <nav ref={navRef} className="main-nav" aria-label={t('Điều hướng chính')}>{navItems.map(renderItem)}</nav>
    <button className="mobile-nav-arrow" type="button" onClick={() => scrollNav(1)} disabled={!canScrollRight} aria-label={t('Điều hướng sau')}><ChevronRight size={19} /></button>
    <div className="sidebar-bottom">{renderItem(settingsNavItem)}</div>
  </aside>;
}

export function Header({ user, onNavigate }: { user: User | null; onNavigate: (route: Route) => void }) {
  const { language, setLanguage, t } = useLanguage();
  const label = user ? (user.name.trim() || user.email) : '';
  const initials = user ? (label.split(/s+/).slice(-2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?') : '';
  return <header className="topbar"><div className="topbar-actions"><div className="language-switch" aria-label={t('Ngôn ngữ giao diện')}><button className={language === 'vi' ? 'language-switch-active' : ''} onClick={() => setLanguage('vi')} aria-pressed={language === 'vi'}>VI</button><button className={language === 'en' ? 'language-switch-active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button></div><button className="user-chip" onClick={() => onNavigate(user ? 'profile' : 'login')}><span className="avatar avatar-small">{user ? initials : <LogIn size={14} />}</span><span className="user-chip-name">{user ? label : t('Đăng nhập')}</span>{user && <ChevronDown size={14} />}</button></div></header>;
}

export function DataPageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) { const { t } = useLanguage(); return <div className="data-page"><section className="data-page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> {t(eyebrow)}</div><h1>{t(title)}</h1><p>{t(description)}</p></div></section>{children}</div>; }

export function LeafMark({ large = false }: { large?: boolean }) {
  return <img className={large ? 'leaf-mark leaf-mark-large' : 'leaf-mark'} src="/aethera-mark.svg" alt="" />;
}
