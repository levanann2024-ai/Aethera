import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, ArrowRight, Check } from 'lucide-react';
import { loginAccount, registerAccount } from '@/backend/api';
import { LeafMark } from '@/components/AppLayout';
import { useLanguage } from '@/i18n/useLanguage';
import type { User } from '@/types/auth';
import type { Route } from '@/types/navigation';

type AuthPageProps = {
  mode: 'login' | 'signup';
  onNavigate: (route: Route) => void;
  onAuthenticated: (user: User) => void;
};

export function AuthPage({ mode, onNavigate, onAuthenticated }: AuthPageProps) {
  const { t } = useLanguage();
  const isLogin = mode === 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      const user = isLogin
        ? await loginAccount(email, password)
        : await registerAccount(name, email, password);
      onAuthenticated(user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể kết nối máy chủ tài khoản.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <span className="brand-mark"><LeafMark large /></span>
        <strong>Aethera</strong>
      </div>
      <div className="auth-card">
        <div className="eyebrow"><span className="eyebrow-line" /> {t('Không gian học tập')}</div>
        <h1>{t(isLogin ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản học tập')}</h1>
        <p>
          {t(isLogin
            ? 'Đăng nhập để tiếp tục hành trình khám phá ngôn ngữ.'
            : 'Tạo tài khoản để lưu từ vựng, lịch sử và tiến trình học của bạn.')}
        </p>
        <form onSubmit={submit}>
          {!isLogin && (
            <label>
              {t('Họ và tên')}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('Tên của bạn')}
                maxLength={80}
                autoComplete="name"
                required
              />
            </label>
          )}
          <label>
            {t('Email')}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              maxLength={254}
              autoComplete="email"
              required
            />
          </label>
          <label>
            {t('Mật khẩu')}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('Ít nhất 6 ký tự')}
              minLength={6}
              maxLength={128}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
            />
          </label>
          {error && <div className="form-error" role="alert"><AlertCircle size={16} /> {t(error)}</div>}
          {message && <div className="form-success" role="status"><Check size={16} /> {t(message)}</div>}
          <button className="primary-button" type="submit" disabled={busy}>
            {t(busy ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Tạo tài khoản')} <ArrowRight size={16} />
          </button>
        </form>
        <div className="auth-switch">
          {t(isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?')}{' '}
          <button onClick={() => onNavigate(isLogin ? 'signup' : 'login')}>
            {t(isLogin ? 'Tạo tài khoản' : 'Đăng nhập')}
          </button>
        </div>
      </div>
    </div>
  );
}
