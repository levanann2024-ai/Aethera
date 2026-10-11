import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import type { Route } from '@/types/navigation';

type SettingsPageProps = {
  onNavigate: (route: Route) => void;
};

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="settings-page">
      <div className="data-page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {t('Tùy chỉnh trải nghiệm')}</div>
          <h1>{t('Cài đặt')}</h1>
          <p>{t('Chọn ngôn ngữ giao diện cho toàn bộ ứng dụng.')}</p>
        </div>
      </div>
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <strong>{t('Ngôn ngữ giao diện')}</strong>
            <span>{t('Áp dụng cho toàn bộ giao diện.')}</span>
          </div>
          <select value={language} onChange={(event) => setLanguage(event.target.value as 'vi' | 'en')}>
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <strong>{t('Chế độ trình diễn')}</strong>
            <span>{t('Tài khoản và từ điển đang dùng dữ liệu giả lập trong phiên này.')}</span>
          </div>
          <span className="settings-badge"><Sparkles size={16} /> {t('Demo')}</span>
        </div>
      </div>
      <button className="quiet-button" onClick={() => onNavigate('profile')}>{t('Về trang cá nhân')}</button>
    </div>
  );
}
