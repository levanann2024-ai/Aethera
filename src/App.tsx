import { useEffect, useState } from 'react';
import { Header, LeafMark, Sidebar } from '@/components/AppLayout';
import { getCurrentUser, logoutAccount } from '@/backend/api';
import { navItems } from '@/config/navigation';
import { AuthPage } from '@/pages/AuthPage';
import { AIAssistantPage } from '@/pages/AIAssistantPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { NewsPage } from '@/pages/NewsPage';
import { PracticePage } from '@/pages/PracticePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TranslatePage } from '@/pages/TranslatePage';
import { VocabularyPage } from '@/pages/VocabularyPage';
import { useLanguage } from '@/i18n/useLanguage';
import type { User } from '@/types/auth';
import type { Page, Route } from '@/types/navigation';

const routePaths: Record<Route, string> = {
  home: '/',
  translate: '/translate',
  'ai-assistant': '/ai-assistant',
  vocabulary: '/vocabulary',
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

function App() {
  const { t } = useLanguage();
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const activePage = navItems.some(({ id }) => id === route) ? (route as Page) : undefined;
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

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        collapsed={isSidebarCollapsed}
        onNavigate={navigate}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
      />
      <div className={`content-shell ${route === 'home' ? 'content-shell-home' : ''}`}>
        <Header user={user} onNavigate={navigate} />
        <main className="page-content">
          {route === 'home' && <HomePage onNavigate={navigate} user={user} />}
          {route === 'translate' && <TranslatePage onNavigate={navigate} user={user} />}
          {route === 'ai-assistant' && <AIAssistantPage />}
          {route === 'vocabulary' && <VocabularyPage user={user} />}
          {route === 'practice' && <PracticePage onNavigate={navigate} />}
          {route === 'history' && <HistoryPage onNavigate={navigate} user={user} />}
          {route === 'news' && <NewsPage />}
          {route === 'profile' && (
            <ProfilePage user={user} onNavigate={navigate} onSignOut={handleSignOut} />
          )}
          {route === 'settings' && <SettingsPage onNavigate={navigate} />}
          {route === 'login' && (
            <AuthPage mode="login" onNavigate={navigate} onAuthenticated={handleAuthenticated} />
          )}
          {route === 'signup' && (
            <AuthPage mode="signup" onNavigate={navigate} onAuthenticated={handleAuthenticated} />
          )}
          {route === 'not-found' && <NotFoundPage onNavigate={navigate} />}
        </main>
      </div>
    </div>
  );
}

export default App;
