import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Header, LeafMark, Sidebar } from '@/components/AppLayout';
import { getCurrentUser, logoutAccount } from '@/services/api';
import { AuthPage } from '@/pages/AuthPage';
import { AIAssistantPage } from '@/pages/AIAssistantPage';
import { ContactPage } from '@/pages/ContactPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { Interactivemap } from '@/pages/Interactivemap';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { NewsPage } from '@/pages/NewsPage';
import { PracticePage } from '@/pages/PracticePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TranslatePage } from '@/pages/TranslatePage';
import { VocabularyPage } from '@/pages/VocabularyPage';
import { useLanguage } from '@/i18n/useLanguage';
import { Footer } from '@/components/Footer';
import type { User } from '@/types/auth';
import type { Page, Route } from '@/types/navigation';

const routePaths: Record<Route, string> = {
  home: '/',
  translate: '/translate',
  'ai-assistant': '/ai-assistant',
  'cultural-map': '/cultural-map',
  vocabulary: '/vocabulary',
  contact: '/contact',
  practice: '/practice',
  history: '/history',
  news: '/news',
  profile: '/profile',
  settings: '/settings',
  login: '/login',
  signup: '/signup',
  'not-found': '/404',
};

function routeFromPath(pathname: string): Route {
  return (Object.keys(routePaths) as Route[]).find((route) => routePaths[route] === pathname) ?? 'not-found';
}

const activePageByRoute: Partial<Record<Route, Page>> = { history: 'profile' };
const pageIds: Page[] = ['home', 'translate', 'vocabulary', 'practice', 'ai-assistant', 'cultural-map', 'contact', 'profile', 'settings'];

function activePageForRoute(route: Route): Page | undefined {
  return activePageByRoute[route] ?? pageIds.find((id) => id === route);
}

function App() {
  const { t } = useLanguage();
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTopbarHidden, setIsTopbarHidden] = useState(() => localStorage.getItem('aethera.topbarHidden') === '1');

  const toggleTopbar = () => {
    setIsTopbarHidden((current) => {
      localStorage.setItem('aethera.topbarHidden', current ? '0' : '1');
      return !current;
    });
  };
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextRoute: Route) => {
    const nextPath = routePaths[nextRoute];
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activePage = activePageForRoute(route);
  const handleSignOut = async () => {
    await logoutAccount();
    setUser(null);
    navigate('login');
  };

  const handleAuthenticated = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    navigate('home');
  };

  if (authLoading) {
    return (
      <div className="auth-loading">
        <LeafMark large />
        <span>{t('Đang mở ứng dụng...')}</span>
      </div>
    );
  }

  if (route === 'login' || route === 'signup') {
    return <AuthPage mode={route} onNavigate={navigate} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        collapsed={isSidebarCollapsed}
        onNavigate={navigate}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
      />
      <div className={`content-shell ${route === 'home' ? 'content-shell-home' : ''} ${route === 'translate' || route === 'vocabulary' || route === 'practice' || route === 'contact' || route === 'profile' || route === 'settings' ? 'content-shell-warm' : ''} ${route === 'translate' ? 'content-shell-translate' : ''} ${route === 'ai-assistant' ? 'content-shell-ai' : ''} ${isTopbarHidden ? 'content-shell-topbar-hidden' : ''}`}>
        <Header user={user} onNavigate={navigate} />
        <button type="button" className="topbar-toggle" onClick={toggleTopbar} aria-label={t(isTopbarHidden ? 'Hiện thanh trên cùng' : 'Ẩn thanh trên cùng')} aria-expanded={!isTopbarHidden}>
          {isTopbarHidden ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <main className={`page-content ${route === 'cultural-map' ? 'page-content-map' : ''}`}>
          {route === 'home' && <HomePage onNavigate={navigate} user={user} />}
          {route === 'translate' && <TranslatePage onNavigate={navigate} user={user} />}
          {route === 'ai-assistant' && <AIAssistantPage />}
          {route === 'cultural-map' && <Interactivemap />}
          {route === 'vocabulary' && <VocabularyPage user={user} />}
          {route === 'contact' && <ContactPage />}
          {route === 'practice' && <PracticePage onNavigate={navigate} />}
          {route === 'history' && <HistoryPage onNavigate={navigate} user={user} />}
          {route === 'news' && <NewsPage />}
          {route === 'profile' && (
            <ProfilePage user={user} onNavigate={navigate} onSignOut={handleSignOut} />
          )}
          {route === 'settings' && <SettingsPage user={user} onNavigate={navigate} onSignOut={handleSignOut} />}
          {route === 'not-found' && <NotFoundPage onNavigate={navigate} />}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;
