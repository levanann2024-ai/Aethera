import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, RefreshCw, UserRound } from 'lucide-react';
import { loginAccount, registerAccount, requestCaptcha } from '@/services/api';
import { useLanguage } from '@/i18n/useLanguage';
import type { TargetLanguage, User } from '@/types/auth';
import type { Route } from '@/types/navigation';
import './auth.css';

type AuthPageProps = {
  mode: 'login' | 'signup';
  onNavigate: (route: Route) => void;
  onAuthenticated: (user: User) => void;
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function AuthPage({ mode, onNavigate, onAuthenticated }: AuthPageProps) {
  const { language, setLanguage, t } = useLanguage();
  const isLogin = mode === 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('tay');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaError('');
    setCaptchaAnswer('');
    try {
      const challenge = await requestCaptcha();
      setCaptchaToken(challenge.captchaToken);
      setCaptchaQuestion(challenge.question);
    } catch (requestError) {
      setCaptchaToken('');
      setCaptchaQuestion('');
      setCaptchaError(requestError instanceof Error ? requestError.message : 'Không thể tải CAPTCHA.');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLogin) void loadCaptcha();
  }, [isLogin, loadCaptcha]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const user = isLogin
        ? await loginAccount(email, password)
        : await registerAccount(name, email, password, targetLanguage, captchaToken, captchaAnswer);
      onAuthenticated(user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể kết nối máy chủ tài khoản.');
      if (!isLogin) void loadCaptcha();
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setError('');
    setNotice('');
    onNavigate(isLogin ? 'signup' : 'login');
  };

  return (
    <div className="au-page">
      <aside className="au-visual">
        <div className="au-brand">
          <img src="/aethera-mark.svg" alt="" width="40" height="40" />
          <strong>Aethera</strong>
        </div>
        <div className="au-quote">
          <h2>{t('Giữ tiếng nói của bản làng, học tiếng Việt thật dễ dàng.')}</h2>
          <p>{t('Dịch, tra từ và luyện tập giữa tiếng Tày - Mường và tiếng Việt, ngay trên một nền tảng.')}</p>
        </div>
        <small className="au-credit">{t('Ruộng bậc thang Mù Cang Chải')} · {t('Ảnh')}: Doan Tuan (CC0)</small>
      </aside>

      <main className="au-panel">
        <div className="au-top">
          <div className="au-brand-mobile">
            <img src="/aethera-mark.svg" alt="" width="32" height="32" />
            <strong>Aethera</strong>
          </div>
          <div className="au-lang" role="group" aria-label={t('Ngôn ngữ giao diện')}>
            <button type="button" className={language === 'vi' ? 'au-lang-on' : ''} aria-pressed={language === 'vi'} onClick={() => setLanguage('vi')}>VI</button>
            <button type="button" className={language === 'en' ? 'au-lang-on' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
          </div>
        </div>

        <div className="au-card">
          <h1>{t(isLogin ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản học tập')}</h1>
          <p className="au-sub">
            {t(isLogin
              ? 'Đăng nhập để tiếp tục hành trình khám phá ngôn ngữ.'
              : 'Tạo tài khoản để lưu từ vựng, lịch sử và tiến trình học của bạn.')}
          </p>

          <button type="button" className="au-google" onClick={() => setNotice('Đăng nhập bằng Google chưa được cấu hình. Vui lòng dùng email và mật khẩu.')}>
            <GoogleMark /> {t(isLogin ? 'Đăng nhập bằng Google' : 'Đăng ký bằng Google')}
          </button>

          <div className="au-or"><span>{t('hoặc dùng email')}</span></div>

          <form onSubmit={submit}>
            {!isLogin && (
              <label className="au-field">
                <span>{t('Họ và tên')}</span>
                <div><UserRound size={18} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('Tên của bạn')} maxLength={80} autoComplete="name" required /></div>
              </label>
            )}
            {!isLogin && (
              <label className="au-field">
                <span>{t('Ngôn ngữ bạn muốn học')}</span>
                <div className="au-select-wrap">
                  <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value as TargetLanguage)}>
                    <option value="tay">{t('Tiếng Tày')}</option>
                    <option value="muong">{t('Tiếng Mường')}</option>
                    <option value="hmong">{t("Tiếng H'Mông")}</option>
                    <option value="dao">{t('Tiếng Dao')}</option>
                    <option value="all">{t('Tất cả')}</option>
                  </select>
                </div>
              </label>
            )}
            <label className="au-field">
              <span>{t('Email')}</span>
              <div><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" maxLength={254} autoComplete="email" required /></div>
            </label>
            <label className="au-field">
              <span>{t('Mật khẩu')}</span>
              <div>
                <Lock size={18} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t(isLogin ? 'Nhập mật khẩu' : 'Ít nhất 8 ký tự')} minLength={isLogin ? 1 : 8} maxLength={128} autoComplete={isLogin ? 'current-password' : 'new-password'} required />
                <button type="button" className="au-eye" onClick={() => setShowPassword((current) => !current)} aria-label={t(showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu')}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {!isLogin && (
              <div className="au-captcha">
                <label className="au-field" htmlFor="captcha-answer">
                  <span>{t('Xác minh bạn là người thật')}</span>
                  <div className="au-captcha-controls">
                    <strong aria-live="polite">{captchaLoading ? t('Đang tải...') : captchaQuestion || t('CAPTCHA chưa sẵn sàng')}</strong>
                    <button type="button" className="au-captcha-refresh" onClick={() => void loadCaptcha()} disabled={captchaLoading} aria-label={t('Tạo CAPTCHA mới')}>
                      <RefreshCw size={17} />
                    </button>
                  </div>
                  <div>
                    <input
                      id="captcha-answer"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={captchaAnswer}
                      onChange={(event) => setCaptchaAnswer(event.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder={t('Nhập đáp án')}
                      required
                      disabled={!captchaToken || captchaLoading}
                    />
                  </div>
                </label>
                {captchaError && <div className="au-error" role="alert"><AlertCircle size={16} /> {t(captchaError)}</div>}
              </div>
            )}

            {error && <div className="au-error" role="alert"><AlertCircle size={16} /> {t(error)}</div>}
            {notice && <div className="au-notice" role="status">{t(notice)}</div>}

            <button className="au-submit" type="submit" disabled={busy || (!isLogin && (!captchaToken || !captchaAnswer || Boolean(captchaError)))}>
              {t(busy ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Tạo tài khoản')} <ArrowRight size={17} />
            </button>
          </form>

          <p className="au-switch">
            {t(isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?')}{' '}
            <button type="button" onClick={switchMode}>{t(isLogin ? 'Tạo tài khoản' : 'Đăng nhập')}</button>
          </p>
          <button type="button" className="au-guest" onClick={() => onNavigate('home')}>{t('Tiếp tục không cần tài khoản')}</button>
        </div>
      </main>
    </div>
  );
}
