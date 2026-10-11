import { useState } from 'react';
import { ArrowRight, BookOpen, History, LogIn, LogOut, Settings, UserRound } from 'lucide-react';
import type { User } from '@/types/auth';
import { useLanguage } from '@/i18n/useLanguage';
import type { Route } from '@/types/navigation';

type ProfilePageProps = {
  user: User | null;
  onNavigate: (route: Route) => void;
  onSignOut: () => Promise<void>;
};

export function ProfilePage({ user, onNavigate, onSignOut }: ProfilePageProps) {
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setError('');
    setSigningOut(true);
    try {
      await onSignOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Không thể đăng xuất.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="account-page">
      <div className="account-hero">
        <div className="account-avatar"><UserRound size={28} /></div>
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {t('Trang cá nhân')}</div>
          <h1>{user?.name ?? t('Khách học tập')}</h1>
          <p>{user?.email ?? t('Đang sử dụng ở chế độ khách')}</p>
        </div>
      </div>
      {user ? (
        <>
          <div className="account-grid">
            <div className="account-card">
              <span className="account-card-icon"><BookOpen size={18} /></span>
              <div><strong>{t('Từ vựng của tôi')}</strong><span>{t('Tra cứu, thêm và nhập các mục từ đã được kiểm chứng.')}</span></div>
              <button className="quiet-button" onClick={() => onNavigate('vocabulary')}>{t('Mở')} <ArrowRight size={15} /></button>
            </div>
            <div className="account-card">
              <span className="account-card-icon"><History size={18} /></span>
              <div><strong>{t('Lịch sử tra từ')}</strong><span>{t('Những lượt tra từ của riêng bạn.')}</span></div>
              <button className="quiet-button" onClick={() => onNavigate('history')}>{t('Mở')} <ArrowRight size={15} /></button>
            </div>
          </div>
          {error && <div className="form-error" role="alert">{t(error)}</div>}
          <div className="account-actions">
            <button className="secondary-button" onClick={() => onNavigate('settings')}><Settings size={16} /> {t('Cài đặt tài khoản')}</button>
            <button className="quiet-button danger-button" onClick={signOut} disabled={signingOut}>
              <LogOut size={16} /> {t(signingOut ? 'Đang đăng xuất...' : 'Đăng xuất')}
            </button>
          </div>
        </>
      ) : (
        <div className="data-empty">
          <div className="empty-page-icon"><LogIn size={24} /></div>
          <h2>{t('Bạn đang sử dụng ở chế độ khách')}</h2>
          <p>{t('Tạo tài khoản hoặc đăng nhập để lưu cài đặt và quản lý tài khoản học tập.')}</p>
          <button className="primary-button" onClick={() => onNavigate('login')}><LogIn size={16} /> {t('Đăng nhập')}</button>
        </div>
      )}
    </div>
  );
}
