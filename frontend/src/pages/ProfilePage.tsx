import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Flame, HandHeart, LogIn, LogOut, MessageCircle, Pin, Search, Settings, Volume2 } from 'lucide-react';
import { activeStreak, getActivities, weekCounts } from '@/services/activity';
import { searchDictionary } from '@/services/api';
import { getStudyHistory } from '@/services/study-history';
import { getLearnedIds } from '@/services/vocabulary-progress';
import { useLanguage } from '@/i18n/useLanguage';
import type { User } from '@/types/auth';
import type { DictionaryEntry } from '@/types/dictionary';
import type { Route } from '@/types/navigation';
import { speakText } from './review/reviewUtils';
import './profile.css';

type ProfilePageProps = {
  user: User | null;
  onNavigate: (route: Route) => void;
  onSignOut: () => void;
};

type Item = { id: string; kind: 'lookup' | 'ask' | 'pin' | 'learn'; text: string; tag?: string; at: number };

const WEEK_GOAL = 5;
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const kindIcon = { lookup: Search, ask: MessageCircle, pin: Pin, learn: CheckCircle2 };
const kindLabel = { lookup: 'Tra cứu', ask: 'Hỏi AI', pin: 'Đã ghim', learn: 'Đã thuộc' };

function initials(user: User) {
  const source = user.name.trim() || user.email;
  return source.split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

export function ProfilePage({ user, onNavigate, onSignOut }: ProfilePageProps) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<Map<string, DictionaryEntry>>(new Map());

  useEffect(() => {
    Promise.all([searchDictionary('tay'), searchDictionary('muong')])
      .then(([tay, muong]) => setEntries(new Map([...tay, ...muong].map((entry) => [entry.id, entry]))))
      .catch(() => setEntries(new Map()));
  }, []);

  const { items, learnedCount, streak, week, activeDays } = useMemo(() => {
    const activities = getActivities();
    let lookups: ReturnType<typeof getStudyHistory> = [];
    try {
      lookups = getStudyHistory(user?.id);
    } catch {
      lookups = [];
    }
    const all: Item[] = [
      ...lookups.map((record): Item => ({ id: `l-${record.id}`, kind: 'lookup', text: record.source, tag: record.language === 'tay' ? 'Tày' : 'Mường', at: Date.parse(record.createdAt) })),
      ...activities.map((entry): Item => ({ id: entry.id, kind: entry.type, text: entry.text, at: entry.at })),
    ].filter((item) => Number.isFinite(item.at)).sort((a, b) => b.at - a.at);
    const stamps = all.map((item) => ({ id: item.id, type: 'lookup' as const, text: item.text, at: item.at }));
    const counts = weekCounts(stamps);
    return { items: all, learnedCount: getLearnedIds().size, streak: activeStreak(stamps), week: counts, activeDays: counts.filter(Boolean).length };
  }, [user?.id]);

  const todayIndex = (new Date().getDay() + 6) % 7;
  const maxCount = Math.max(1, ...week);
  const goalPercent = Math.min(100, Math.round((activeDays / WEEK_GOAL) * 100));

  const describe = (item: Item) => {
    if (item.kind === 'pin' || item.kind === 'learn') {
      const entry = entries.get(item.text);
      return entry ? { text: entry.sourceTerm, tag: entry.sourceLanguage === 'tay' ? 'Tày' : 'Mường' } : { text: t('Một từ vựng'), tag: undefined };
    }
    return { text: item.text, tag: item.tag };
  };

  const formatTime = (time: number) => {
    const date = new Date(time);
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const clock = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (time >= startOfToday) return `${t('Hôm nay')}, ${clock}`;
    if (time >= startOfToday - 86400000) return `${t('Hôm qua')}, ${clock}`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  if (!user) {
    return (
      <div className="pf-page">
        <header className="pf-head">
          <h1>{t('Hồ sơ cá nhân')}</h1>
          <p>{t('Đăng nhập để xem hành trình học tập của bạn.')}</p>
        </header>
        <section className="pf-card pf-guest">
          <div className="pf-avatar pf-avatar-guest"><LogIn size={30} /></div>
          <h2>{t('Bạn chưa đăng nhập')}</h2>
          <p>{t('Tiến độ học và lịch sử tra cứu sẽ hiển thị ở đây.')}</p>
          <button type="button" className="pf-primary" onClick={() => onNavigate('login')}>{t('Đăng nhập')}</button>
        </section>
      </div>
    );
  }

  return (
    <div className="pf-page">
      <header className="pf-head">
        <h1>{t('Hồ sơ cá nhân')}</h1>
        <p>{t('Theo dõi hành trình học tập và hoạt động gần đây của bạn.')}</p>
      </header>

      <section className="pf-card pf-me">
        <div className="pf-avatar">{initials(user)}</div>
        <div className="pf-who">
          <h2>{user.name || user.email}</h2>
          <span>{user.email}</span>
        </div>
        <div className="pf-me-actions">
          <button type="button" className="pf-ghost" onClick={() => onNavigate('settings')}><Settings size={16} /> {t('Cài đặt')}</button>
          <button type="button" className="pf-ghost" onClick={onSignOut}><LogOut size={16} /> {t('Đăng xuất')}</button>
        </div>
      </section>

      <div className="pf-grid">
        <section className="pf-card">
          <h3>{t('Hành trình học tập')}</h3>
          <div className="pf-stats">
            <div className="pf-stat pf-stat-mint"><BookOpen size={20} /><strong>{learnedCount}</strong><span>{t('Từ đã thuộc')}</span></div>
            <div className="pf-stat pf-stat-sand"><Flame size={20} /><strong>{streak}</strong><span>{t('Ngày liên tiếp')}</span></div>
            <div className="pf-stat pf-stat-sky"><Search size={20} /><strong>{week.reduce((sum, value) => sum + value, 0)}</strong><span>{t('Hoạt động tuần này')}</span></div>
          </div>

          <div className="pf-week" role="img" aria-label={t('Hoạt động trong tuần')}>
            {week.map((count, index) => (
              <div key={DAY_LABELS[index]} className={`pf-day ${index === todayIndex ? 'pf-day-today' : ''}`}>
                <div className="pf-bar"><i style={{ height: `${count ? Math.max(14, (count / maxCount) * 100) : 0}%` }} /></div>
                <span>{DAY_LABELS[index]}</span>
              </div>
            ))}
          </div>

          <div className="pf-goal">
            <div><strong>{t('Mục tiêu tuần')}</strong><span>{activeDays}/{WEEK_GOAL} {t('ngày có học')}</span></div>
            <div className="pf-goal-track"><i style={{ width: `${goalPercent}%` }} /></div>
          </div>
        </section>

        <section className="pf-card">
          <h3>{t('Hoạt động gần đây')}</h3>
          {items.length === 0 ? (
            <div className="pf-empty">
              <p>{t('Chưa có hoạt động nào. Hãy thử dịch một câu hoặc ghim một từ nhé!')}</p>
              <button type="button" className="pf-primary" onClick={() => onNavigate('translate')}>{t('Bắt đầu dịch')}</button>
            </div>
          ) : (
            <ul className="pf-list">
              {items.slice(0, 8).map((item) => {
                const Icon = kindIcon[item.kind];
                const shown = describe(item);
                return (
                  <li key={item.id}>
                    <span className={`pf-kind pf-kind-${item.kind}`}><Icon size={16} /></span>
                    <div>
                      <strong>{shown.text}</strong>
                      <small>{t(kindLabel[item.kind])} · {formatTime(item.at)}</small>
                    </div>
                    {shown.tag && <em>{shown.tag}</em>}
                    {(item.kind === 'lookup' || item.kind === 'pin' || item.kind === 'learn') && (
                      <button type="button" className="pf-speak" onClick={() => speakText(shown.text)} aria-label={`${t('Nghe')} ${shown.text}`}><Volume2 size={16} /></button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="pf-card pf-contribute">
        <span className="pf-kind pf-kind-pin"><HandHeart size={22} /></span>
        <div>
          <h3>{t('Đóng góp từ vựng')}</h3>
          <p>{t('Thêm từ Tày - Mường mới hoặc nhập file CSV để giúp từ điển đầy đặn hơn.')}</p>
        </div>
        <button type="button" className="pf-primary" onClick={() => onNavigate('vocabulary')}>{t('Mở trang từ vựng')}</button>
      </section>
    </div>
  );
}
