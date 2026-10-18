import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, MessageCircle, Mic, PanelLeft, Plus, Sparkles, Volume2, X } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import { logActivity } from '@/services/activity';
import { speakText } from '@/pages/review/reviewUtils';
import { chatIntro, chatRespond } from './chatEngine';
import type { ChatReply } from './chatEngine';
import './chat.css';

type Message = { id: string; from: 'bot' | 'user'; text: string; chips?: string[] };
type Session = { id: string; title: string; messages: Message[]; updatedAt: number };

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const ETHNICS = ['Mường', 'Thái', 'Tày'] as const;
const LEVELS = ['Tiểu học', 'THCS', 'THPT'] as const;
type Ethnic = (typeof ETHNICS)[number];
type Level = (typeof LEVELS)[number];

const STORAGE_KEY = 'aethera.ai.chats';
const NEW_TITLE = 'Cuộc trò chuyện mới';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const botMessage = (reply: ChatReply): Message => ({ id: newId(), from: 'bot', text: reply.text, chips: reply.chips });

function freshSession(): Session {
  return { id: newId(), title: NEW_TITLE, messages: [botMessage(chatIntro())], updatedAt: Date.now() };
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

export function ChatMode({ initialText = '', onBack }: { initialText?: string; onBack: () => void }) {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [current, setCurrent] = useState<Session>(freshSession);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [ethnic, setEthnic] = useState<Ethnic>('Mường');
  const [level, setLevel] = useState<Level>('Tiểu học');
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
    const withUser: Session = {
      ...base,
      title: base.title === NEW_TITLE ? text.slice(0, 28) : base.title,
      messages: [...base.messages, { id: newId(), from: 'user', text }],
      updatedAt: Date.now(),
    };
    commit(withUser);
    logActivity('ask', text.slice(0, 80));
    setBusy(true);
    try {
      const reply = await chatRespond(text);
      commit({ ...withUser, messages: [...withUser.messages, botMessage(reply)] });
    } catch {
      commit({ ...withUser, messages: [...withUser.messages, botMessage({ text: 'Có lỗi xảy ra, bạn thử lại nhé.' })] });
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

  const changeMode = (nextEthnic: Ethnic, nextLevel: Level) => {
    if (nextEthnic === ethnic && nextLevel === level) return;
    setEthnic(nextEthnic);
    setLevel(nextLevel);
    setToast(`Đã chuyển sang chế độ tiếng ${nextEthnic} - ${nextLevel}`);
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
        <button type="button" className="aic-new" onClick={() => setCurrent(freshSession())}><Plus size={18} /> {t('Cuộc trò chuyện mới')}</button>
        <span className="aic-history-label">{t('LỊCH SỬ CHAT')}</span>
        <ul>
          {sessions.map((session) => (
            <li key={session.id}>
              <button type="button" className={session.id === current.id ? 'aic-history-on' : ''} onClick={() => setCurrent(session)}>
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
          </div>
          <div className="aic-modes">
            <div className="aic-seg" role="group" aria-label={t('Dân tộc')}>
              {ETHNICS.map((item) => (
                <button key={item} type="button" className={item === ethnic ? 'aic-seg-on' : ''} aria-pressed={item === ethnic} onClick={() => changeMode(item, level)}>{item}</button>
              ))}
            </div>
            <div className="aic-seg" role="group" aria-label={t('Cấp học')}>
              {LEVELS.map((item) => (
                <button key={item} type="button" className={item === level ? 'aic-seg-on' : ''} aria-pressed={item === level} onClick={() => changeMode(ethnic, item)}>{item}</button>
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
                  <p>{message.from === 'bot' ? t(message.text) : message.text}</p>
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
