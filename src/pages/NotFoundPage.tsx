import { AlertCircle, ArrowLeft, House } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import type { Route } from '@/types/navigation';

export function NotFoundPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { t } = useLanguage();
  return (
    <div className="not-found-page">
      <div className="empty-page-icon"><AlertCircle size={25} /></div>
      <div className="eyebrow"><span className="eyebrow-line" /> {t('Đường dẫn không tồn tại')}</div>
      <h1>{t('Không tìm thấy trang')}</h1>
      <p>{t('Trang bạn đang tìm không tồn tại trong Aethera.')}</p>
      <div className="empty-actions">
        <button className="secondary-button" onClick={() => window.history.back()}><ArrowLeft size={16} /> {t('Quay lại')}</button>
        <button className="primary-button" onClick={() => onNavigate('home')}><House size={16} /> {t('Về trang chủ')}</button>
      </div>
    </div>
  );
}
