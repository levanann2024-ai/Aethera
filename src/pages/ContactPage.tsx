import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, BookOpen, Building2, CheckCircle2, Clock, GraduationCap, Heart, Languages, Mail, MessageCircle, Send, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import './contact.css';

type TopicId = 'feedback' | 'translation' | 'education' | 'language' | 'other';

const topics: { id: TopicId; title: string; description: string; icon?: LucideIcon; tone: string }[] = [
  { id: 'feedback', title: 'Góp ý sản phẩm', description: 'Chia sẻ trải nghiệm, đề xuất tính năng và cải thiện giao diện.', icon: MessageCircle, tone: 'sand' },
  { id: 'translation', title: 'Báo lỗi bản dịch', description: 'Giúp đội ngũ sửa từ sai nghĩa, cách diễn đạt hoặc phát âm.', icon: Languages, tone: 'mint' },
  { id: 'education', title: 'Hợp tác giáo dục', description: 'Dành cho giáo viên, trường học và tổ chức cộng đồng.', icon: GraduationCap, tone: 'sky' },
  { id: 'language', title: 'Đề xuất ngôn ngữ', description: 'Từ vựng, tiếng địa phương cần bổ sung.', icon: BookOpen, tone: 'lime' },
];

const topicLabels: Record<TopicId, string> = {
  feedback: 'Góp ý sản phẩm',
  translation: 'Báo lỗi bản dịch',
  education: 'Hợp tác giáo dục',
  language: 'Đề xuất ngôn ngữ địa phương',
  other: 'Khác',
};

const STORAGE_KEY = 'aethera.feedback';
const MAX_LENGTH = 500;

type Errors = { name?: string; email?: string; message?: string };

export function ContactPage() {
  const { t } = useLanguage();
  const [topic, setTopic] = useState<TopicId>('feedback');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Vui lòng nhập họ và tên.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Vui lòng nhập email hợp lệ.';
    if (!message.trim()) next.message = 'Vui lòng nhập nội dung.';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, { topic, name: name.trim(), email: email.trim(), message: message.trim(), createdAt: Date.now() }]));
    } catch {
      // Nothing else to do: the preview does not send data anywhere.
    }
    setSaved(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div className="ct-page">
      <header className="ct-head">
        <h1>{t('Liên hệ & Góp ý')}</h1>
        <p>{t('Mỗi góp ý của bạn giúp Aethera trở nên gần gũi và chính xác hơn với học sinh dân tộc thiểu số.')}</p>
      </header>

      <div className="ct-topics">
        {topics.map(({ id, title, description, icon: Icon, tone }) => (
          <button key={id} type="button" className={`ct-topic ct-topic-${tone} ${topic === id ? 'ct-topic-on' : ''}`} onClick={() => { setTopic(id); setSaved(false); }} aria-pressed={topic === id}>
            <span className="ct-topic-icon">{Icon && <Icon size={22} />}</span>
            <strong>{t(title)}</strong>
            <span>{t(description)}</span>
            <i><ArrowRight size={14} /></i>
          </button>
        ))}
      </div>

      <div className="ct-grid">
        <form className="ct-form" onSubmit={submit} noValidate>
          <h2><Mail size={22} /> {t('Gửi lời nhắn cho Aethera')}</h2>
          <p className="ct-lead">{t('Điền thông tin bên dưới, chúng mình sẽ cố gắng phản hồi sớm nhất có thể.')}</p>

          {saved && (
            <div className="ct-saved" role="status">
              <CheckCircle2 size={18} />
              <span>{t('Cảm ơn bạn! Lời nhắn đã được lưu trên thiết bị này. Bản xem trước chưa gửi dữ liệu đến máy chủ.')}</span>
            </div>
          )}

          <div className="ct-row">
            <label className="ct-field">
              <span>{t('Họ và tên')} <b>*</b></span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('Tên của bạn')} maxLength={80} aria-invalid={Boolean(errors.name)} />
              {errors.name && <em>{t(errors.name)}</em>}
            </label>
            <label className="ct-field">
              <span>{t('Email liên hệ')} <b>*</b></span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" maxLength={120} aria-invalid={Boolean(errors.email)} />
              {errors.email && <em>{t(errors.email)}</em>}
            </label>
          </div>

          <fieldset className="ct-radios">
            <legend>{t('Bạn muốn trao đổi về?')} <b>*</b></legend>
            {(Object.keys(topicLabels) as TopicId[]).map((id) => (
              <label key={id}>
                <input type="radio" name="topic" checked={topic === id} onChange={() => setTopic(id)} />
                <span>{t(topicLabels[id])}</span>
              </label>
            ))}
          </fieldset>

          <label className="ct-field">
            <span>{t('Nội dung')} <b>*</b></span>
            <textarea rows={5} value={message} onChange={(event) => setMessage(event.target.value.slice(0, MAX_LENGTH))} placeholder={t('Chia sẻ điều bạn muốn đội ngũ biết...')} aria-invalid={Boolean(errors.message)} />
            <small className="ct-count">{message.length}/{MAX_LENGTH}</small>
            {errors.message && <em>{t(errors.message)}</em>}
          </label>

          <button type="submit" className="ct-submit"><Send size={17} /> {t('Gửi lời nhắn')}</button>
          <p className="ct-preview">{t('Bản xem trước này chưa gửi dữ liệu đến máy chủ.')}</p>
        </form>

        <aside className="ct-side">
          <section className="ct-card">
            <h3><Users size={20} /> {t('Thông tin đội ngũ')}</h3>
            <p>{t('Aethera được xây dựng với mong muốn giúp học sinh dân tộc thiểu số dễ dàng tiếp cận tiếng Việt và tri thức.')}</p>
            <div className="ct-quote"><Heart size={20} /><span>{t('Tiếng nói của bạn là động lực để chúng mình làm tốt hơn!')}</span></div>
          </section>

          <section className="ct-card">
            <h3><Mail size={20} /> {t('Liên hệ khác')}</h3>
            <ul className="ct-info">
              <li><Mail size={18} /><div><strong>{t('Email dự án')}</strong><span>{t('Sẽ được cập nhật')}</span></div></li>
              <li><Building2 size={18} /><div><strong>{t('Đơn vị phát triển')}</strong><span>{t('Thông tin chi tiết sẽ được cập nhật')}</span></div></li>
              <li><Clock size={18} /><div><strong>{t('Thời gian phản hồi')}</strong><span>{t('Trong vòng 2 - 3 ngày làm việc (kể từ khi nhận được thông tin).')}</span></div></li>
            </ul>
          </section>

          <section className="ct-card">
            <h3><ShieldCheck size={20} /> {t('Chính sách & Quyền riêng tư')}</h3>
            <p>{t('Chúng tôi chỉ thu thập thông tin cần thiết để xử lý yêu cầu của bạn. Mọi dữ liệu được bảo mật và không sử dụng cho mục đích khác.')}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
