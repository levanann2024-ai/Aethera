import { useState } from 'react';
import type { ReactNode } from 'react';
import { Database, Download, Info, LogIn, LogOut, Trash2, UserRound, Volume2, Palette } from 'lucide-react';
import { clearStudyHistory, getStudyHistory } from '@/services/study-history';
import { getSettings, saveSettings } from '@/services/settings';
import type { Settings } from '@/services/settings';
import { useLanguage } from '@/i18n/useLanguage';
import type { User } from '@/types/auth';
import type { Route } from '@/types/navigation';
import { speakText } from './review/reviewUtils';
import './settings.css';

type SettingsPageProps = {
  user: User | null;
  onNavigate: (route: Route) => void;
  onSignOut: () => void;
};

type Choice<T extends string> = { value: T; label: string };

const KEYS = {
  activity: 'aethera.activity',
  pinned: 'aethera.vocabulary.pinned',
  learned: 'aethera.vocabulary.learned',
  chats: 'aethera.ai.chats',
  plan: 'aethera.ai.plan',
  settings: 'aethera.settings',
  feedback: 'aethera.feedback',
};

function countStored(key: string): number {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(parsed)) return parsed.length;
    return parsed ? 1 : 0;
  } catch {
    return 0;
  }
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Choice<T>[]; onChange: (value: T) => void; label: string }) {
  return (
    <div className="st-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={value === option.value ? 'st-seg-on' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="st-row">
      <div><strong>{title}</strong>{hint && <span>{hint}</span>}</div>
      {children}
    </div>
  );
}

export function SettingsPage({ user, onNavigate, onSignOut }: SettingsPageProps) {
  const { language, setLanguage, t } = useLanguage();
  const [settings, setSettings] = useState<Settings>(getSettings);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState('');

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const lookupCount = (() => {
    try {
      return getStudyHistory(user?.id).length;
    } catch {
      return 0;
    }
  })();

  const dataRows: { id: string; title: string; count: number; clear: () => void }[] = [
    { id: 'lookup', title: 'Lịch sử tra cứu', count: lookupCount, clear: () => clearStudyHistory(user?.id) },
    { id: 'activity', title: 'Hoạt động gần đây', count: countStored(KEYS.activity), clear: () => localStorage.removeItem(KEYS.activity) },
    { id: 'vocab', title: 'Từ đã ghim và đã thuộc', count: countStored(KEYS.pinned) + countStored(KEYS.learned), clear: () => { localStorage.removeItem(KEYS.pinned); localStorage.removeItem(KEYS.learned); } },
    { id: 'chats', title: 'Cuộc trò chuyện với AI', count: countStored(KEYS.chats), clear: () => localStorage.removeItem(KEYS.chats) },
    { id: 'plan', title: 'Kế hoạch học', count: countStored(KEYS.plan), clear: () => localStorage.removeItem(KEYS.plan) },
  ];

  const clearRow = (row: (typeof dataRows)[number]) => {
    if (!window.confirm(`${t('Xóa')} "${t(row.title)}"? ${t('Thao tác này không thể hoàn tác.')}`)) return;
    row.clear();
    setVersion((current) => current + 1);
    setNotice(`${t('Đã xóa')}: ${t(row.title)}.`);
  };

  const exportData = () => {
    const data: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    Object.entries(KEYS).forEach(([name, key]) => {
      try {
        data[name] = JSON.parse(localStorage.getItem(key) ?? 'null');
      } catch {
        data[name] = null;
      }
    });
    try {
      data.lookups = getStudyHistory(user?.id);
    } catch {
      data.lookups = [];
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aethera-du-lieu.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice(t('Đã tạo file dữ liệu của bạn.'));
  };

  return (
    <div className="st-page" key={version}>
      <header className="st-head">
        <h1>{t('Cài đặt')}</h1>
        <p>{t('Tùy chỉnh Aethera cho thoải mái và dễ dùng với bạn.')}</p>
      </header>

      {notice && <div className="st-notice" role="status">{notice}</div>}

      <section className="st-card">
        <h2><UserRound size={20} /> {t('Tài khoản')}</h2>
        {user ? (
          <div className="st-account">
            <div className="st-avatar">{(user.name.trim() || user.email)[0]?.toUpperCase()}</div>
            <div><strong>{user.name || user.email}</strong><span>{user.email}</span></div>
            <button type="button" className="st-ghost" onClick={() => onNavigate('profile')}>{t('Xem hồ sơ')}</button>
            <button type="button" className="st-ghost" onClick={onSignOut}><LogOut size={16} /> {t('Đăng xuất')}</button>
          </div>
        ) : (
          <div className="st-account">
            <div className="st-avatar st-avatar-guest"><LogIn size={20} /></div>
            <div><strong>{t('Bạn chưa đăng nhập')}</strong><span>{t('Đăng nhập để lưu lịch sử tra cứu theo tài khoản.')}</span></div>
            <button type="button" className="st-primary" onClick={() => onNavigate('login')}>{t('Đăng nhập')}</button>
          </div>
        )}
      </section>

      <section className="st-card">
        <h2><Palette size={20} /> {t('Giao diện và học tập')}</h2>
        <Row title={t('Ngôn ngữ giao diện')} hint={t('Áp dụng cho toàn bộ giao diện.')}>
          <Segmented label={t('Ngôn ngữ giao diện')} value={language} onChange={setLanguage} options={[{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }]} />
        </Row>
        <Row title={t('Ngôn ngữ học mặc định')} hint={t('Trang Dịch và Từ vựng sẽ mở sẵn ngôn ngữ này.')}>
          <Segmented label={t('Ngôn ngữ học mặc định')} value={settings.defaultLanguage} onChange={(defaultLanguage) => update({ defaultLanguage })} options={[{ value: 'tay', label: 'Tày' }, { value: 'muong', label: 'Mường' }]} />
        </Row>
        <Row title={t('Cỡ chữ nội dung')} hint={t('Phóng to phần nội dung cho dễ đọc.')}>
          <Segmented label={t('Cỡ chữ nội dung')} value={settings.textScale} onChange={(textScale) => update({ textScale })} options={[{ value: 'normal', label: t('Vừa') }, { value: 'large', label: t('Lớn') }, { value: 'xlarge', label: t('Rất lớn') }]} />
        </Row>
        <Row title={t('Giảm hiệu ứng chuyển động')} hint={t('Tắt hoạt ảnh nếu bạn thấy chóng mặt hoặc bị phân tâm.')}>
          <button type="button" role="switch" aria-checked={settings.reduceMotion} aria-label={t('Giảm hiệu ứng chuyển động')} className={`st-switch ${settings.reduceMotion ? 'st-switch-on' : ''}`} onClick={() => update({ reduceMotion: !settings.reduceMotion })}><i /></button>
        </Row>
      </section>

      <section className="st-card">
        <h2><Volume2 size={20} /> {t('Giọng đọc')}</h2>
        <Row title={t('Tốc độ đọc')} hint={t('Dùng cho mọi nút nghe trong ứng dụng.')}>
          <Segmented label={t('Tốc độ đọc')} value={settings.voiceSpeed} onChange={(voiceSpeed) => update({ voiceSpeed })} options={[{ value: 'slow', label: t('Chậm') }, { value: 'normal', label: t('Vừa') }, { value: 'fast', label: t('Nhanh') }]} />
        </Row>
        <button type="button" className="st-ghost st-test" onClick={() => { if (!speakText('Xin chào, mình là Aethera.')) setNotice(t('Trình duyệt chưa hỗ trợ đọc thành tiếng.')); }}><Volume2 size={16} /> {t('Nghe thử')}</button>
      </section>

      <section className="st-card">
        <h2><Database size={20} /> {t('Dữ liệu trên thiết bị')}</h2>
        <p className="st-lead">{t('Mọi dữ liệu học tập đang được lưu ngay trong trình duyệt này, chưa gửi lên máy chủ.')}</p>
        <ul className="st-data">
          {dataRows.map((row) => (
            <li key={row.id}>
              <div><strong>{t(row.title)}</strong><span>{row.count} {t('mục')}</span></div>
              <button type="button" className="st-danger" onClick={() => clearRow(row)} disabled={row.count === 0}><Trash2 size={15} /> {t('Xóa')}</button>
            </li>
          ))}
        </ul>
        <button type="button" className="st-ghost st-test" onClick={exportData}><Download size={16} /> {t('Tải dữ liệu của tôi (JSON)')}</button>
      </section>

      <section className="st-card">
        <h2><Info size={20} /> {t('Về Aethera')}</h2>
        <p className="st-lead">{t('Tài khoản và từ điển đang dùng dữ liệu giả lập trong phiên này.')}</p>
        <button type="button" className="st-ghost st-test" onClick={() => onNavigate('contact')}>{t('Gửi góp ý cho đội ngũ')}</button>
      </section>
    </div>
  );
}
