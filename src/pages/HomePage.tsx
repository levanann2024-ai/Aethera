import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import type { User } from '@/types/auth';
import type { Route } from '@/types/navigation';

type HubCard = {
  route: Route;
  title: string;
  description: string;
  tone: 'mint' | 'sky' | 'sand';
  Art: () => JSX.Element;
};

function MicArt() {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true">
      <path d="M0 96c40-18 62-6 100-12s70-18 100-6v42H0Z" fill="#cfe8dd" />
      <path d="M0 108c50-14 80 0 118-6s54-10 82-2v20H0Z" fill="#b6dccb" />
      <g stroke="#7cc2a6" strokeWidth="4" strokeLinecap="round">
        <path d="M30 60v16M42 52v32M54 58v20M146 58v20M158 52v32M170 60v16" />
      </g>
      <rect x="84" y="14" width="32" height="56" rx="16" fill="#1f6b53" />
      <path d="M72 52v6a28 28 0 0 0 56 0v-6" fill="none" stroke="#1f6b53" strokeWidth="6" strokeLinecap="round" />
      <path d="M100 86v14M84 100h32" stroke="#1f6b53" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function ChatArt() {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true">
      <path d="M0 98c44-14 70-2 104-8s60-14 96-4v34H0Z" fill="#cfe8e4" />
      <path d="M0 110c52-12 84 0 124-6s48-8 76-2v18H0Z" fill="#b5dbd5" />
      <path d="M58 22h84a16 16 0 0 1 16 16v32a16 16 0 0 1-16 16h-48l-24 20v-20H58a16 16 0 0 1-16-16V38a16 16 0 0 1 16-16Z" fill="#1f6b53" />
      <circle cx="78" cy="54" r="6.5" fill="#fff" />
      <circle cx="100" cy="54" r="6.5" fill="#fff" />
      <circle cx="122" cy="54" r="6.5" fill="#fff" />
      <path d="M158 14l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#f3c644" />
      <path d="M40 18l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5Z" fill="#9fd3c0" />
    </svg>
  );
}

function BookArt() {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true">
      <path d="M0 96h200v24H0Z" fill="#f1e4c3" />
      <path d="M0 100l8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5v20H0Z" fill="#e6d3a2" />
      <ellipse cx="102" cy="100" rx="64" ry="6" fill="#d9c58f" opacity=".6" />
      <rect x="54" y="12" width="82" height="84" rx="8" fill="#14503f" />
      <rect x="58" y="12" width="78" height="84" rx="8" fill="#1f6b53" />
      <path d="M62 12v84" stroke="#14503f" strokeWidth="3" />
      <path d="M70 12h13v30l-6.5-6-6.5 6Z" fill="#f3c644" />
      <rect x="94" y="46" width="62" height="46" rx="6" fill="#fbf5e0" />
      <rect x="94" y="46" width="62" height="46" rx="6" fill="none" stroke="#e6d3a2" strokeWidth="2" />
      <rect x="102" y="55" width="26" height="5" rx="2.5" fill="#cdb878" />
      <rect x="102" y="66" width="44" height="4" rx="2" fill="#e6d3a2" />
      <rect x="102" y="75" width="38" height="4" rx="2" fill="#e6d3a2" />
      <rect x="102" y="84" width="30" height="4" rx="2" fill="#e6d3a2" />
    </svg>
  );
}

const cards: HubCard[] = [
  { route: 'translate', title: 'Dịch giọng nói', description: 'Nói tiếng địa phương, nhận bản dịch Quốc ngữ', tone: 'mint', Art: MicArt },
  { route: 'ai-assistant', title: 'Trợ lý AI', description: 'Hỏi bài, luyện giao tiếp và hiểu từ khó', tone: 'sky', Art: ChatArt },
  { route: 'vocabulary', title: 'Sổ từ vựng & Ôn tập', description: 'Lưu từ mới và luyện lại những gì đã học', tone: 'sand', Art: BookArt },
];

function SkyArt() {
  return (
    <svg className="hub-sky-art" viewBox="0 0 520 260" aria-hidden="true">
      <path d="M0 200 120 90l70 62 90-100 120 120 60-40 60 68v58H0Z" fill="#dfe9dc" />
      <path d="M0 226 100 140l90 62 110-80 130 100 90-60v92H0Z" fill="#cbdcc9" />
      <g fill="#8c6a3f">
        <path d="M296 168h96l12 14h-120Z" />
        <path d="M356 150h80l10 14h-100Z" />
      </g>
      <g fill="#f3e6c4">
        <path d="M306 182h76v28h-76Z" />
        <path d="M366 164h60v26h-60Z" />
      </g>
      <g stroke="#6b4f2c" strokeWidth="4" strokeLinecap="round">
        <path d="M312 210v22M332 210v22M352 210v22M372 210v22M372 190v42M392 190v42M412 190v42" />
      </g>
      <g fill="#7fa86a">
        <circle cx="470" cy="190" r="24" />
        <circle cx="492" cy="206" r="18" />
        <circle cx="262" cy="204" r="16" />
      </g>
      <path d="M470 214v30M262 218v26" stroke="#5b7f4d" strokeWidth="5" />
    </svg>
  );
}

function OrnamentArt() {
  return (
    <svg className="hub-ornament" viewBox="0 0 120 120" aria-hidden="true">
      <g fill="none" stroke="#e5cf93" strokeWidth="3">
        <path d="M60 6 114 60 60 114 6 60Z" />
        <path d="M60 24 96 60 60 96 24 60Z" />
        <path d="M60 42 78 60 60 78 42 60Z" />
        <path d="M60 6v108M6 60h108" />
      </g>
    </svg>
  );
}

function LandscapeArt() {
  return (
    <svg className="hub-landscape" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 120c120-40 220-30 340-8s240 8 340-14 360-30 520 8v94H0Z" fill="#e4eddc" />
      <path d="M0 150c160-30 300-20 460 0s300 10 420-6 220-14 320 4v52H0Z" fill="#cfe0c8" />
      <path d="M0 184c200-18 420-10 640-2s380-6 560-12v30H0Z" fill="#b9d3b2" />
      <g fill="#8fb583">
        <path d="M60 200c4-40 16-70 40-90-8 34-4 62 6 90Z" />
        <path d="M1090 200c-2-44-14-74-44-96 10 36 6 66-8 96Z" />
      </g>
    </svg>
  );
}

export function HomePage({ onNavigate }: { onNavigate: (route: Route) => void; user: User | null }) {
  const { t } = useLanguage();

  return (
    <div className="hub-page">
      <SkyArt />
      <OrnamentArt />
      <LandscapeArt />

      <section className="hub-intro">
        <div className="hub-kicker">{t('Cùng Aethera xóa bỏ rào cản ngôn ngữ – Giúp bạn tự tin học tập mỗi ngày')}</div>
        <h1>{t('Hôm nay bạn muốn làm gì?')}</h1>
        <p>{t('Chọn một cách để bắt đầu học và sử dụng tiếng Tày–Mường.')}</p>
      </section>

      <section className="hub-cards" aria-label={t('Lối tắt chính')}>
        {cards.map(({ route, title, description, tone, Art }) => (
          <article key={route} className={`hub-card hub-card-${tone}`}>
            <div className="hub-card-art"><Art /></div>
            <h2>{t(title)}</h2>
            <p>{t(description)}</p>
            <button type="button" className="hub-card-cta" onClick={() => onNavigate(route)}>
              <span>{t('Bắt đầu ngay')}</span>
              <span className="hub-card-cta-arrow"><ArrowRight size={17} strokeWidth={2.6} /></span>
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
