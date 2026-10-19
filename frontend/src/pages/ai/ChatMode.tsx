import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, MessageCircle, Mic, PanelLeft, Plus, Sparkles, Volume2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLanguage } from '@/i18n/useLanguage';
import { logActivity } from '@/services/activity';
import { sendAIChat } from '@/services/api';
import type { ChatAudience, ChatAudienceId, ChatHistoryMessage, ChatLanguage } from '@/services/api';
import { speakText } from '@/pages/review/reviewUtils';
import { chatIntro } from './chatEngine';
import type { ChatReply } from './chatEngine';
import './chat.css';

type Message = { id: string; from: 'bot' | 'user'; text: string; chips?: string[] };
type Session = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  language?: ChatLanguage;
  audience?: ChatAudience;
};

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const CHAT_LANGUAGES: Array<{ label: string; value: ChatLanguage }> = [
  { label: 'Mường', value: 'muong' },
  { label: 'Thái', value: 'thai' },
  { label: 'Tày', value: 'tay' },
];
const AUDIENCE_LABELS: Record<ChatAudienceId, string> = {
  primary: 'Học sinh Tiểu học',
  middle: 'Học sinh THCS',
  high: 'Học sinh THPT',
  community: 'Người dân địa phương / người lớn',
  educator: 'Giáo viên / cán bộ văn hóa / người dạy tiếng',
};

const STORAGE_KEY = 'aethera.ai.chats';
const NEW_TITLE = 'Cuộc trò chuyện mới';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const botMessage = (reply: ChatReply): Message => ({ id: newId(), from: 'bot', text: reply.text, chips: reply.chips });

function freshSession(language: ChatLanguage, audience: ChatAudience): Session {
  return {
    id: newId(),
    title: NEW_TITLE,
    messages: [botMessage(chatIntro())],
    updatedAt: Date.now(),
    language,
    audience,
  };
}

function loadSessions(): Session[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as Session[]).filter((session) => session && Array.isArray(session.messages)) : [];
  } catch {
    return [];
  }
}

function recognitionClass(): (new () => Recognition) | null {
  const scope = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function ChatMode({
  initialText = '',
  initialAudience,
  onBack,
}: {
  initialText?: string;
  initialAudience: ChatAudience;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [language, setLanguage] = useState<ChatLanguage>('muong');
  const [audience, setAudience] = useState<ChatAudience>(initialAudience);
  const [current, setCurrent] = useState<Session>(() => freshSession('muong', initialAudience));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [listening, setListening] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(() => window.innerWidth >= 900);
  const endRef = useRef<HTMLDivElement>(null);
  const recognizer = useRef<Recognition | null>(null);
  const started = useRef(false);
  const canListen = recognitionClass() !== null;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
    } catch {
      // History then lives only in memory.
    }
  }, [sessions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [current.messages.length, busy]);

  useEffect(() => () => recognizer.current?.stop(), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const commit = (session: Session) => {
    setCurrent(session);
    setSessions((list) => [session, ...list.filter((item) => item.id !== session.id)]);
  };

  const send = async (base: Session, text: string) => {
    const chatLanguage = base.language ?? language;
    const chatAudience = base.audience ?? audience;
    const withUser: Session = {
      ...base,
      title: base.title === NEW_TITLE ? text.slice(0, 28) : base.title,
      messages: [...base.messages, { id: newId(), from: 'user', text }],
      updatedAt: Date.now(),
      language: chatLanguage,
      audience: chatAudience,
    };
    commit(withUser);
    logActivity('ask', text.slice(0, 80));
    setBusy(true);
    try {
      const history: ChatHistoryMessage[] = base.messages
        .slice(1)
        .slice(-20)
        .map((message) => ({ role: message.from === 'bot' ? 'model' : 'user', text: message.text }));
      const reply = await sendAIChat(text, chatLanguage, chatAudience, history);
      commit({ ...withUser, messages: [...withUser.messages, botMessage({ text: reply })] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra, bạn thử lại nhé.';
      commit({ ...withUser, messages: [...withUser.messages, botMessage({ text: errorMessage })] });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!initialText || started.current) return;
    started.current = true;
    void send(current, initialText);
    // Runs once for the question typed on the launcher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeLanguage = (nextLanguage: ChatLanguage) => {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    commit({ ...current, language: nextLanguage, audience });
    const label = CHAT_LANGUAGES.find((item) => item.value === nextLanguage)?.label ?? nextLanguage;
    setToast(`Đã chuyển ngôn ngữ đang học sang tiếng ${label}`);
  };

  const openSession = (session: Session) => {
    setCurrent(session);
    setLanguage(session.language ?? 'muong');
    setAudience(session.audience ?? initialAudience);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void send(current, text);
  };

  const toggleListening = () => {
    if (listening) {
      recognizer.current?.stop();
      return;
    }
    const Recognizer = recognitionClass();
    if (!Recognizer) return;
    const recognition = new Recognizer();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.onresult = (event) => setDraft(event.results[0]?.[0]?.transcript ?? '');
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognizer.current = recognition;
    setListening(true);
    recognition.start();
  };

  const last = current.messages[current.messages.length - 1];

  return (
    <div className={`aic-chat ${historyOpen ? '' : 'aic-chat-closed'}`}>
      <aside className="aic-history">
        <button type="button" className="aic-new" onClick={() => setCurrent(freshSession(language, audience))}><Plus size={18} /> {t('Cuộc trò chuyện mới')}</button>
        <span className="aic-history-label">{t('LỊCH SỬ CHAT')}</span>
        <ul>
          {sessions.map((session) => (
            <li key={session.id}>
              <button type="button" className={session.id === current.id ? 'aic-history-on' : ''} onClick={() => openSession(session)}>
                <MessageCircle size={15} /> <span>{t(session.title)}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="aic-main">
        <header className="aic-bar">
          <button type="button" className="aic-square" onClick={() => setHistoryOpen((open) => !open)} aria-label={t('Lịch sử chat')}><PanelLeft size={18} /></button>
          <button type="button" className="aic-back" onClick={onBack}><ArrowLeft size={16} /> {t('Quay lại')}</button>
          <div>
            <small>{t('TRỢ LÝ HỌC TẬP')}</small>
            <h1>{t('Trò chuyện với AI')}: {t(current.title)}</h1>
            <span className="aic-audience-badge">
              {t(audience.type === 'preset' ? AUDIENCE_LABELS[audience.id] : audience.description)}
            </span>
          </div>
          <div className="aic-modes">
            <div className="aic-seg" role="group" aria-label={t('Ngôn ngữ đang học trong cuộc trò chuyện này')}>
              {CHAT_LANGUAGES.map((item) => (
                <button key={item.value} type="button" className={item.value === language ? 'aic-seg-on' : ''} aria-pressed={item.value === language} onClick={() => changeLanguage(item.value)}>{t(item.label)}</button>
              ))}
            </div>
          </div>
        </header>

        <div className="aic-thread" aria-live="polite">
          {current.messages.map((message) => (
            <div key={message.id} className={`aic-msg aic-msg-${message.from}`}>
              {message.from === 'bot' && <span className="aic-avatar"><Sparkles size={18} /></span>}
              <div className="aic-msg-body">
                <small>{message.from === 'bot' ? t('TRỢ LÝ AI') : t('BẠN')}</small>
                <div className="aic-bubble">
                  {message.from === 'bot'
                    ? <div className="aic-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{t(message.text)}</ReactMarkdown></div>
                    : <p>{message.text}</p>}
                  <button type="button" className="aic-speak" onClick={() => speakText(message.text)} aria-label={t('Nghe')}><Volume2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
          {busy && <div className="aic-msg aic-msg-bot"><div className="aic-bubble aic-typing"><i /><i /><i /></div></div>}
          {!busy && last.from === 'bot' && last.chips && (
            <div className="aic-chips">
              {last.chips.map((chip) => <button key={chip} type="button" onClick={() => void send(current, chip)}>{t(chip)}</button>)}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="aic-composer" onSubmit={submit}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={listening ? t('Đang nghe...') : t('Nhập câu hỏi của bạn...')} maxLength={240} aria-label={t('Nhập câu hỏi của bạn')} />
          {draft && <button type="button" className="aic-clear" onClick={() => setDraft('')} aria-label={t('Xóa nội dung')}><X size={17} /></button>}
          {canListen && (
            <button type="button" className={`aic-clear ${listening ? 'aic-mic-on' : ''}`} onClick={toggleListening} aria-label={t('Nói để nhập')} aria-pressed={listening}><Mic size={18} /></button>
          )}
          <button type="submit" className="aic-send" disabled={!draft.trim() || busy}>{t('Gửi')} <ArrowUpRight size={16} /></button>
        </form>
      </section>
      {toast && <div className="aic-toast" role="status">{t(toast)}</div>}
    </div>
  );
}
