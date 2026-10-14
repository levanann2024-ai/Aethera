import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight, ArrowRight, BookOpen, ClipboardPaste, Copy, FileText, Globe, History, Image as ImageIcon,
  Keyboard, Languages, Mic, Square, Star, UploadCloud, Volume2, X
} from 'lucide-react';
import { getSettings } from '@/backend/settings';
import { lookupPhrase, lookupVietnameseToEthnic } from '@/backend/api';
import { addStudyRecord } from '@/backend/study-history';
import { suggestedVocabulary } from '@/data/sampleDictionary';
import type { PhraseLookup, SourceLanguage } from '@/types/dictionary';
import type { User } from '@/types/auth';
import type { Route } from '@/types/navigation';
import { useLanguage } from '@/i18n/useLanguage';
import './translate.css';

type InputKind = 'text' | 'voice' | 'image' | 'document' | 'web';

const waveformBars = Array.from({ length: 44 }, (_, index) => 6 + Math.round(Math.abs(Math.sin(index * 0.9) * Math.cos(index * 0.31)) * 22));

const MAX_LENGTH = 2000;
const IMAGE_TYPES = '.jpg,.jpeg,.png,.webp';
const DOC_TYPES = '.txt,.md,.csv';

const kinds: { id: InputKind; label: string; icon: typeof Languages }[] = [
  { id: 'text', label: 'Văn bản', icon: Languages },
  { id: 'voice', label: 'Giọng nói', icon: Mic },
  { id: 'image', label: 'Hình ảnh', icon: ImageIcon },
  { id: 'document', label: 'Tài liệu', icon: FileText },
  { id: 'web', label: 'Trang web', icon: Globe }
];

export function TranslatePage({ user, onNavigate }: { onNavigate?: (route: Route) => void; user: User | null }) {
  const { t } = useLanguage();
  const [kind, setKind] = useState<InputKind>('text');
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>(() => getSettings().defaultLanguage);
  const [reverseDirection, setReverseDirection] = useState(false);
  const [lookup, setLookup] = useState<PhraseLookup | null>(null);
  const [notice, setNotice] = useState('');
  const [fileName, setFileName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [webLoading, setWebLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recordingParts = useRef<Blob[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotice(t('Chức năng ghi âm phụ thuộc vào quyền microphone của trình duyệt.'));
      return;
    }
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = microphone;
      recordingParts.current = [];
      const nextRecorder = new MediaRecorder(microphone);
      recorder.current = nextRecorder;
      nextRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) recordingParts.current.push(event.data);
      });
      nextRecorder.addEventListener('stop', () => {
        microphone.getTracks().forEach((track) => track.stop());
        stream.current = null;
        recorder.current = null;
        if (!mounted.current) return;
        const audio = new Blob(recordingParts.current, { type: nextRecorder.mimeType || 'audio/webm' });
        setRecordingUrl(URL.createObjectURL(audio));
        setIsRecording(false);
      });
      nextRecorder.start();
      setIsRecording(true);
      setNotice('');
    } catch {
      setNotice(t('Không thể truy cập microphone. Hãy cấp quyền microphone hoặc nhập văn bản.'));
    }
  };

  const toggleRecording = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    else void startRecording();
  };

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    const text = sourceText.trim();
    if (!text) {
      setLookup(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = reverseDirection
          ? await lookupVietnameseToEthnic(sourceLanguage, text)
          : await lookupPhrase(sourceLanguage, text);
        if (cancelled) return;
        setLookup(result);
        setNotice('');
        try {
          addStudyRecord(text, result, user?.id);
        } catch {
          setNotice(t('Tra cứu xong nhưng không thể lưu lịch sử trên thiết bị này.'));
        }
      } catch (error) {
        if (!cancelled) setNotice(error instanceof Error ? error.message : t('Không thể tải từ điển.'));
      }
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText, sourceLanguage, reverseDirection, user?.id]);

  const matchedSegments = lookup?.segments.filter((segment) => segment.matched) ?? [];
  const translation = matchedSegments.map((segment) => segment.meaning).join(' · ');

  const resetInput = () => {
    setSourceText('');
    setLookup(null);
    setNotice('');
    setFileName('');
    setImageUrl('');
    setWebUrl('');
  };

  const switchKind = (next: InputKind) => {
    if (next === kind) return;
    if (isRecording) recorder.current?.stop();
    resetInput();
    setKind(next);
  };

  const switchDirection = () => {
    setReverseDirection((prev) => !prev);
    setSourceText('');
    setLookup(null);
    setNotice('');
  };

  const pasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setSourceText(text.slice(0, MAX_LENGTH));
    } catch {
      setNotice(t('Không thể đọc nội dung từ bộ nhớ tạm trên thiết bị này.'));
    }
  };

  const copyLookup = async () => {
    if (!matchedSegments.length) {
      setNotice(t('Chưa có mục khớp trong từ điển.'));
      return;
    }
    try {
      await navigator.clipboard.writeText(matchedSegments.map((segment) => `${segment.source}: ${segment.meaning}`).join('\n'));
      setNotice(t('Đã sao chép'));
    } catch {
      setNotice(t('Không thể sao chép nội dung trên thiết bị này.'));
    }
  };

  const speak = (text: string, lang: string) => {
    if (!('speechSynthesis' in window)) {
      setNotice(t('Trình duyệt chưa hỗ trợ đọc thành tiếng.'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    setNotice('');
    setLookup(null);
    if (kind === 'image') {
      if (!IMAGE_TYPES.split(',').includes(ext)) {
        setNotice(t('Chỉ hỗ trợ tệp .jpg, .jpeg, .png, .webp.'));
        return;
      }
      setFileName(file.name);
      setImageUrl(URL.createObjectURL(file));
      setSourceText('');
      setNotice(t('Chưa thể tự đọc chữ trong ảnh. Hãy nhập lại nội dung trong ảnh để dịch.'));
      return;
    }
    if (!DOC_TYPES.split(',').includes(ext)) {
      setNotice(t('Hiện chỉ đọc được tệp .txt, .md, .csv.'));
      return;
    }
    setFileName(file.name);
    setSourceText((await file.text()).slice(0, MAX_LENGTH));
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    void handleFile(event.dataTransfer.files[0]);
  };

  const translateWeb = async () => {
    let url: URL;
    try {
      url = new URL(webUrl.trim());
      if (!/^https?:$/.test(url.protocol)) throw new Error();
    } catch {
      setNotice(t('Đầu vào phải là một URL web không trống, có định dạng đúng.'));
      return;
    }
    setWebLoading(true);
    setNotice('');
    try {
      const response = await fetch(url.href);
      if (!response.ok) throw new Error();
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      doc.querySelectorAll('script,style,noscript').forEach((node) => node.remove());
      setSourceText((doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH));
    } catch {
      setNotice(t('Không thể tải trang web này (có thể bị trình duyệt chặn). Hãy dán nội dung vào mục Văn bản.'));
    } finally {
      setWebLoading(false);
    }
  };

  const ethnicTabs = (
    <div className="gt-tabs" role="tablist">
      {(['tay', 'muong'] as const).map((code) => (
        <button
          key={code}
          type="button"
          role="tab"
          aria-selected={sourceLanguage === code}
          className={`gt-tab ${sourceLanguage === code ? 'gt-tab-active' : ''}`}
          onClick={() => setSourceLanguage(code)}
        >
          {t(code === 'tay' ? 'Tày' : 'Mường')}
        </button>
      ))}
    </div>
  );
  const commonTab = (
    <div className="gt-tabs">
      <button type="button" className="gt-tab gt-tab-active">{t('Tiếng phổ thông')}</button>
    </div>
  );

  const langBar = (
    <div className="gt-langbar">
      {reverseDirection ? commonTab : ethnicTabs}
      <button type="button" className="gt-swap" onClick={switchDirection} aria-label={t('Đổi chiều dịch')} title={t('Đổi chiều dịch')}>
        <ArrowLeftRight size={20} />
      </button>
      {reverseDirection ? ethnicTabs : commonTab}
    </div>
  );

  const resultPanel = (
    <div className="gt-card gt-card-result">
      <div className="gt-result-body" aria-live="polite">
        {!lookup && (
          <div className="gt-empty"><BookOpen size={28} strokeWidth={1.4} /><span>{t('Bản dịch sẽ hiển thị ở đây')}</span></div>
        )}
        {lookup && !matchedSegments.length && (
          <div className="gt-empty"><BookOpen size={28} strokeWidth={1.4} /><span>{t('Chưa có mục khớp trong từ điển.')}</span></div>
        )}
        {lookup && matchedSegments.length > 0 && (
          <>
            <p className="gt-result-main">{translation}</p>
            <ul className="gt-parts">
              {lookup.segments.map((segment, index) => (
                <li key={`${segment.source}-${index}`} className={segment.matched ? '' : 'gt-missing'}>
                  <strong>{segment.source}</strong>
                  <span>{segment.matched ? segment.meaning : t('Chưa có trong từ điển')}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="gt-toolbar">
        <button type="button" className="gt-icon" onClick={() => speak(translation, 'vi-VN')} disabled={!matchedSegments.length} aria-label={t('Nghe')} title={t('Nghe')}><Volume2 size={20} /></button>
        <span className="gt-toolbar-spacer" />
        <button type="button" className="gt-icon" onClick={() => void copyLookup()} disabled={!matchedSegments.length} aria-label={t('Sao chép')} title={t('Sao chép')}><Copy size={20} /></button>
        <button type="button" className="gt-icon" onClick={() => onNavigate?.('vocabulary')} aria-label={t('Xem từ điển')} title={t('Xem từ điển')}><BookOpen size={20} /></button>
      </div>
    </div>
  );

  const dropzone = (accept: string, types: string, withPaste: boolean) => (
    <>
      <section
        className={`gt-drop ${dragOver ? 'gt-drop-over' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="gt-drop-left">
          {imageUrl ? <img className="gt-preview" src={imageUrl} alt={fileName} /> : <div className="gt-cloud"><UploadCloud size={56} /></div>}
          {fileName ? <span className="gt-file"><FileText size={18} /> {fileName}</span> : <span className="gt-drop-title">{t('Kéo và thả')}</span>}
        </div>
        <div className="gt-drop-right">
          <h3>{t('Hoặc chọn một tệp')}</h3>
          <button type="button" className="gt-btn gt-btn-primary" onClick={() => fileInput.current?.click()}>{t('Duyệt qua các tệp')}</button>
          {withPaste && (
            <button type="button" className="gt-btn" style={{ height: '35xpx', width: '300px' }} onClick={() => void pasteText()}>
              <ClipboardPaste size={16} style={{ verticalAlign: -3, marginRight: 6 }} />{t('Dán nội dung từ bảng nhớ tạm')}
            </button>
          )}
          <p className="gt-hint">{t('Các loại tệp được hỗ trợ')}: {types}</p>
          <input ref={fileInput} type="file" accept={accept} hidden onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
      </section>
      {(sourceText || imageUrl) && (
        <section className="gt-split">
          <div className="gt-card">
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder={t('Nhập nội dung cần dịch...')}
              aria-label={t('Nhập văn bản')}
              maxLength={MAX_LENGTH}
            />
            <div className="gt-toolbar"><span className="gt-toolbar-spacer" /><span className="gt-count">{sourceText.length} / {MAX_LENGTH}</span></div>
          </div>
          {resultPanel}
        </section>
      )}
    </>
  );

  const languageSelect = (
    <select className="tr-select" value={sourceLanguage} onChange={(event) => { setSourceLanguage(event.target.value as SourceLanguage); setLookup(null); }} aria-label={t('Ngôn ngữ nguồn')}>
      <option value="tay">{t('Tày')}</option>
      <option value="muong">{t('Mường')}</option>
    </select>
  );

  return (
    <div className="gt-page">
      <div className="gt-modes" role="tablist" aria-label={t('Chọn cách nhập nội dung')}>
        {kinds.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={kind === id} className={`gt-mode ${kind === id ? 'gt-mode-active' : ''}`} onClick={() => switchKind(id)}>
            <Icon size={18} /> {t(label)}
          </button>
        ))}
      </div>

      {kind === 'voice' ? (
        <div className="tr-lang-row">
          <span style={{ whiteSpace: 'nowrap' }}>{t('Tiếng phổ thông')}</span>
          <ArrowRight size={22} />
          {languageSelect}
        </div>
      ) : langBar}

      {kind === 'text' && (
        <>
          <section className="gt-split">
            <div className="gt-card">
              <textarea
                id="source-text"
                value={sourceText}
                onChange={(event) => { setSourceText(event.target.value); setNotice(''); }}
                placeholder={t('Nhập câu hoặc đoạn văn cần dịch...')}
                aria-label={t('Nhập văn bản')}
                maxLength={MAX_LENGTH}
              />
              {sourceText && (
                <button type="button" className="gt-icon gt-clear" onClick={resetInput} aria-label={t('Xóa nội dung')}><X size={20} /></button>
              )}
              <div className="gt-toolbar">
                <button type="button" className="gt-icon" onClick={() => speak(sourceText, 'vi-VN')} disabled={!sourceText.trim() || !reverseDirection} aria-label={t('Nghe')} title={t('Nghe')}><Volume2 size={20} /></button>
                <button type="button" className="gt-icon" onClick={() => void pasteText()} aria-label={t('Dán văn bản')} title={t('Dán văn bản')}><ClipboardPaste size={20} /></button>
                <span className="gt-toolbar-spacer" />
                <span className="gt-count">{sourceText.length} / {MAX_LENGTH}</span>
              </div>
            </div>
            {resultPanel}
          </section>
          <div className="gt-chips" aria-label={t('Gợi ý từ điển')}>
            <span className="gt-chips-label">{t('Gợi ý từ điển')}:</span>
            {suggestedVocabulary.map(({ word, meaning }) => {
              const value = reverseDirection ? meaning.split(/[,.]/)[0].trim() : word;
              return <button key={word} type="button" className="gt-chip" title={meaning} onClick={() => setSourceText(value)}>{value}</button>;
            })}
          </div>
        </>
      )}

      {kind === 'voice' && (
        <div className="tr-voice-body">
          <section className={`tr-mic-card ${isRecording ? 'tr-mic-recording' : ''}`}>
            <button
              type="button"
              className="tr-mic-button"
              onClick={toggleRecording}
              aria-label={t(isRecording ? 'Dừng ghi âm' : recordingUrl ? 'Ghi âm lại' : 'Bắt đầu ghi âm')}
              aria-pressed={isRecording}
            >
              {isRecording ? <Square size={30} fill="currentColor" /> : <Mic size={38} />}
            </button>
            <strong>{t(isRecording ? 'Đang nghe...' : 'Nhấn để nói')}</strong>
            <div className="tr-wave" aria-hidden="true">
              {waveformBars.map((height, index) => <span key={index} style={{ height, animationDelay: `${(index % 9) * 70}ms` }} />)}
            </div>
            <small>{t('Bạn có thể nói một câu hoặc một đoạn ngắn')}</small>
            {recordingUrl && !isRecording && <audio className="tr-playback" controls src={recordingUrl} />}
          </section>

          <section className="tr-line-card">
            <span className="tr-line-label">{t('Nội dung đã nghe')}</span>
            <div className="tr-line-row">
              <textarea
                value={sourceText}
                rows={2}
                onChange={(event) => { setSourceText(event.target.value); setNotice(''); }}
                placeholder={t('Nhập lại nội dung bạn vừa nói để tra nghĩa')}
                aria-label={t('Nội dung đã nghe')}
                maxLength={MAX_LENGTH}
              />
              <button type="button" className="tr-link-button" onClick={() => speak(sourceText, 'vi-VN')} disabled={!sourceText.trim()}><Volume2 size={15} /> {t('Nghe')}</button>
            </div>
          </section>

          <section className="tr-line-card tr-line-card-warm">
            <span className="tr-line-label">{t('Bản dịch tiếng dân tộc')}</span>
            <div className="tr-line-row">
              <div className="tr-line-result">{translation || t('Bản dịch sẽ hiển thị ở đây')}</div>
              <button type="button" className="tr-link-button" onClick={() => void copyLookup()} disabled={!matchedSegments.length}><Copy size={15} /> {t('Sao chép')}</button>
            </div>
          </section>
        </div>
      )}

      {kind === 'image' && dropzone(IMAGE_TYPES, '.jpg, .jpeg, .png, .webp', true)}
      {kind === 'document' && dropzone(DOC_TYPES, '.txt, .md, .csv', false)}

      {kind === 'web' && (
        <>
          <section className="gt-web">
            <div className="gt-web-row">
              <div className="gt-field">
                <label htmlFor="web-url">{t('Trang web')}</label>
                <input id="web-url" type="url" value={webUrl} onChange={(event) => setWebUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void translateWeb(); }} placeholder="https://" />
              </div>
              <button type="button" className="gt-go" onClick={() => void translateWeb()} disabled={webLoading || !webUrl.trim()} aria-label={t('Dịch trang web')}><ArrowRight size={24} /></button>
            </div>
          </section>
          {sourceText && (
            <section className="gt-split">
              <div className="gt-card">
                <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} aria-label={t('Nhập văn bản')} maxLength={MAX_LENGTH} />
              </div>
              {resultPanel}
            </section>
          )}
        </>
      )}

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label={t('Đóng thông báo')}><X size={17} /></button>
        </div>
      )}

      <div className="gt-shortcuts">
        <button type="button" className="gt-shortcut" onClick={() => onNavigate?.('history')}>
          <span><History size={26} /></span><span>{t('Nhật ký')}</span>
        </button>
        <button type="button" className="gt-shortcut" onClick={() => onNavigate?.('vocabulary')}>
          <span><Star size={26} /></span><span>{t('Đã lưu')}</span>
        </button>
      </div>
    </div>
  );
}
