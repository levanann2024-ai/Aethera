import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Gamepad2,
  Languages,
  Sparkles,
} from 'lucide-react';
import { getStudyHistory } from '@/backend/study-history';
import type { StudyRecord } from '@/backend/study-history';
import { LeafMark } from '@/components/AppLayout';
import { mockNewsArticles } from '@/data/mockData';
import { useLanguage } from '@/i18n/useLanguage';
import type { User } from '@/types/auth';
import type { Route } from '@/types/navigation';

const learningPaths = [
  {
    number: '01',
    kicker: 'NGHE · NÓI · HIỂU',
    title: 'Tra từ điển',
    description: 'Khám phá cách tra từ và đối chiếu nghĩa theo từng cụm.',
    action: 'Khám phá từ mới',
    actionArt: '🔎',
    route: 'translate',
    Icon: Languages,
    tone: 'blue',
  },
  {
    number: '02',
    kicker: 'GHI NHỚ MỖI NGÀY',
    title: 'Từ vựng của tôi',
    description: 'Xem lại từ mới và quản lý sổ tay học tập của bạn.',
    action: 'Ghi nhớ ngay',
    actionArt: '✏️',
    route: 'vocabulary',
    Icon: BookOpen,
    tone: 'gold',
  },
  {
    number: '03',
    kicker: 'TIẾN BỘ TỪNG BƯỚC',
    title: 'Luyện tập',
    description: 'Ôn nghĩa qua những câu hỏi ngắn, nhẹ nhàng mỗi ngày.',
    action: 'Bắt đầu kiểm tra',
    actionArt: '🎮',
    route: 'practice',
    Icon: Gamepad2,
    tone: 'green',
  },
] as const;

function StoryArtwork({ index }: { index: number }) {
  return (
    <svg className={`story-art story-art-${index + 1}`} viewBox="0 0 400 220" role="img" aria-label="">
      <defs>
        <linearGradient id={`story-sky-${index}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={index === 1 ? '#9bcde0' : '#c7e6dd'} />
          <stop offset="1" stopColor={index === 1 ? '#eff2da' : '#f5efd2'} />
        </linearGradient>
      </defs>
      <path fill={`url(#story-sky-${index})`} d="M0 0h400v220H0z" />
      <circle cx={index === 1 ? 315 : 74} cy="49" r="23" fill="#ffe39a" opacity=".9" />
      <path d="m0 133 85-73 73 69 85-91 157 113v69H0Z" fill="#75a997" />
      <path d="m0 154 101-49 76 52 102-78 121 65v76H0Z" fill="#357d67" />
      {index === 0 && (
        <>
          <path d="M0 171c99-31 184-7 270 49H0Z" fill="#d7a647" />
          <path d="M0 188c103-31 193-4 249 32H0Z" fill="#f4ce64" />
          <path d="M244 142h70v54h-70z" fill="#eee0bd" />
          <path d="m234 145 45-36 48 36Z" fill="#884c38" />
          <path d="M257 159h14v20h-14zm27 0h14v20h-14z" fill="#4c7565" />
          <path d="M71 137v44m20-49v52m21-44v48m22-35v41" stroke="#f4ecd7" strokeWidth="4" opacity=".8" />
        </>
      )}
      {index === 1 && (
        <>
          <path d="M0 178c95-30 180-25 263 42H0Z" fill="#d8bb70" />
          <path d="M37 151h116v61H37z" fill="#b88a59" />
          <path d="m25 155 68-56 74 56Z" fill="#554c3d" />
          <path d="M79 172h29v40H79z" fill="#70563b" />
          <path d="M48 164h20v19H48zm71 0h20v19h-20z" fill="#c6dfd1" />
          <path d="M0 202c119-19 206-14 293 18H0Z" fill="#668d51" />
        </>
      )}
      {index === 2 && (
        <>
          <path d="M0 160c100-39 236-22 400 16v44H0Z" fill="#80a956" />
          <path d="M0 182c112-35 249-15 400 17v21H0Z" fill="#b7bd62" />
          <path d="M0 205c133-32 271-5 400 10v5H0Z" fill="#e3cc7b" />
          <path d="M58 147h58v44H58z" fill="#d8c9a0" />
          <path d="m49 150 38-30 39 30Z" fill="#5b5140" />
          <path d="M79 164h15v27H79z" fill="#536c58" />
          <path d="M206 153h49v36h-49z" fill="#ddd0aa" />
          <path d="m199 155 31-25 33 25Z" fill="#5b5140" />
        </>
      )}
      <path d="M0 216c99-13 202-12 400 0v4H0Z" fill="#145b49" opacity=".65" />
    </svg>
  );
}

function ProgressMeter({
  label,
  complete,
  total,
}: {
  label: string;
  complete: number;
  total: number;
}) {
  const percentage = Math.round((complete / total) * 100);
  return (
    <div className="home-progress-meter">
      <div className="home-progress-label">
        <span>{label}: {complete} / {total}</span>
        <strong>{percentage}%</strong>
      </div>
      <div
        className="home-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={complete}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function HomePage({ onNavigate, user }: { onNavigate: (route: Route) => void; user: User | null }) {
  const { language, t } = useLanguage();
  const [recentRecords, setRecentRecords] = useState<StudyRecord[]>([]);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    try {
      setRecentRecords(getStudyHistory(user?.id).slice(0, 3));
      setHistoryError('');
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Không thể đọc lịch sử học tập.');
    }
  }, [user?.id]);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-hero-kicker">
            <span />
            {t('Mỗi ngày một chút, hiểu thêm một lời.')}
          </div>
          <h1>
            {t('Hành trình kết nối ngôn ngữ')}
            <em>{t('Tày - Mường')}</em>
          </h1>
          <p>{t('Khám phá ngôn ngữ địa phương, học từ mới và kết nối với tri thức mỗi ngày.')}</p>
          <div className="home-hero-actions">
            <button className="home-hero-primary" onClick={() => onNavigate('translate')}>
              <Languages size={20} /> {t('Khám phá ngay')} <ArrowRight size={19} />
            </button>
            <button className="home-hero-secondary" onClick={() => onNavigate('practice')}>
              <Sparkles size={18} /> {t('Ôn tập nhanh')}
            </button>
          </div>
        </div>
        <div className="home-hero-art" aria-hidden="true">
          <span className="home-art-orbit home-art-orbit-one" />
          <span className="home-art-orbit home-art-orbit-two" />
          <span className="home-art-circle"><LeafMark large /></span>
          <span className="home-art-tag home-art-tag-top"><Languages size={15} /> {t('Tày · Mường')}</span>
          <span className="home-art-tag home-art-tag-bottom"><BookOpen size={15} /> {t('Học từ ngữ cảnh')}</span>
        </div>
      </section>

      {historyError && <div className="notice" role="alert">{t(historyError)}</div>}

      <section className="home-journey">
        <div className="home-section-heading home-journey-heading">
          <div>
            <div className="home-section-kicker"><span /> {t('Bắt đầu hành trình')}</div>
            <h2>{t('Học theo cách của bạn')}</h2>
          </div>
          <p>{t('Ba công cụ đơn giản để khám phá từ mới và luyện tập mỗi ngày.')}</p>
        </div>
        <div className="home-journey-grid">
          {learningPaths.map(({ number, kicker, title, description, action, actionArt, route, Icon, tone }) => (
            <article
              key={route}
              className={`home-journey-card home-journey-${tone}`}
            >
              <span className="home-journey-number">{number}</span>
              <span className="home-journey-icon"><Icon size={23} strokeWidth={2.2} /></span>
              <span className="home-journey-kicker">{t(kicker)}</span>
              <strong className="home-journey-title">{t(title)}</strong>
              <span className="home-journey-description">{t(description)}</span>
              <button className="home-journey-cta" type="button" onClick={() => onNavigate(route)}>
                <span className="home-journey-cta-label">{t(action)}</span>
                <span className="home-journey-cta-art" aria-hidden="true">
                  {actionArt}
                  {tone === 'green' && <span className="home-journey-cta-check">✓</span>}
                </span>
                <ArrowRight className="home-journey-cta-arrow" size={18} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="home-activity-grid">
        <div className="home-recent-panel">
          <div className="home-panel-heading">
            <div>
              <div className="home-section-kicker"><span /> {t('Dấu chân học tập')}</div>
              <h2>{t('Lịch sử tra từ gần đây')}</h2>
            </div>
            <span className="home-panel-badge">{recentRecords.length} {t('lượt tra')}</span>
          </div>
          {recentRecords.length ? (
            <div className="home-recent-list">
              {recentRecords.map((record) => (
                <button key={record.id} className="home-recent-row" onClick={() => onNavigate('history')}>
                  <span className="home-recent-icon"><Languages size={20} /></span>
                  <span className="home-recent-copy">
                    <strong>{record.source}</strong>
                    <small>{t(record.language === 'tay' ? 'Tiếng Tày' : 'Tiếng Mường')} · {t('Nhấn để xem chi tiết')}</small>
                  </span>
                  <span className="home-recent-time">
                    {new Date(record.createdAt).toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    <ArrowRight size={16} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="home-recent-empty">
              <span className="home-empty-icon"><Clock3 size={22} /></span>
              <div>
                <strong>{t('Hành trình của bạn bắt đầu từ đây')}</strong>
                <p>{t('Những lượt tra từ đầu tiên sẽ được lưu tại thiết bị này.')}</p>
              </div>
              <button onClick={() => onNavigate('translate')}>{t('Tra từ')} <ArrowRight size={17} /></button>
            </div>
          )}
        </div>

        <aside className="home-progress-panel">
          <div className="home-progress-heading">
            <div>
              <div className="home-section-kicker"><span /> {t('Dấu chân học tập')}</div>
              <h2>{t('Tiến trình học tập hôm nay')}</h2>
            </div>
            <span className="home-progress-badge">{t('7 ngày')}</span>
          </div>
          <div className="home-goal-card">
            <div>
              <span>{t('Mục tiêu hôm nay')}</span>
              <strong>{t('10 từ mới')}</strong>
            </div>
            <strong className="home-goal-percent">70%</strong>
          </div>
          <ProgressMeter label={t('Số từ đã học')} complete={7} total={10} />
          <ProgressMeter label={t('Số từ đã ôn')} complete={3} total={5} />
          <div className="home-progress-message">
            <Check size={18} />
            <span>{t('Bạn chỉ còn')} <strong>3 {t('từ nữa')}</strong> {t('để hoàn thành mục tiêu hôm nay.')}</span>
          </div>
          <span className="home-demo-caption">{t('Tiến trình minh họa cho bản demo')}</span>
        </aside>
      </section>

      <section className="home-stories">
        <div className="home-section-heading">
          <div>
            <div className="home-section-kicker"><span /> {t('Câu chuyện bản địa')}</div>
            <h2>{t('Khám phá văn hóa & tin tức')}</h2>
            <p>{t('Những câu chuyện về ngôn ngữ, con người và tri thức cộng đồng.')}</p>
          </div>
          <button className="home-stories-link" onClick={() => onNavigate('news')}>
            {t('Xem tất cả')} <ArrowRight size={18} />
          </button>
        </div>
        <div className="home-story-grid">
          {mockNewsArticles.map((article, index) => (
            <button key={article.id} className="home-story-card" onClick={() => onNavigate('news')}>
              <span className="home-story-art"><StoryArtwork index={index} /></span>
              <span className={`home-story-category home-story-category-${article.accent}`}>{t(article.category)}</span>
              <strong>{t(article.title)}</strong>
              <span className="home-story-meta"><CalendarDays size={15} /> {t(article.readTime)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
