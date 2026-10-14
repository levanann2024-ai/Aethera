import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight, BookOpen, ClipboardPaste, Copy, FileText, History, Image as ImageIcon,
  Languages, Mic, Star, UploadCloud, Volume2, X
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

type InputKind = 'text' | 'image';

const MAX_LENGTH = 2000;
const IMAGE_TYPES = '.jpg,.jpeg,.png,.webp';

const kinds: { id: InputKind; label: string; icon: typeof Languages }[] = [
  { id: 'text', label: 'Văn bản', icon: Languages },
  { id: 'image', label: 'Hình ảnh', icon: ImageIcon }
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
  const fileInput = useRef<HTMLInputElement>(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setNotice(t('Trình duyệt chưa hỗ trợ nhận diện giọng nói.'));
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        if (!mounted.current) return;
        setIsListening(true);
        setNotice(t('Đang nghe...'));
      };

      recognition.onresult = (event: any) => {
        if (!mounted.current) return;
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSourceText(transcript.slice(0, MAX_LENGTH));
      };

      recognition.onerror = () => {
        if (!mounted.current) return;
        setIsListening(false);
        setNotice(t('Không thể nhận diện giọng nói.'));
      };

      recognition.onend = () => {
        if (!mounted.current) return;
        setIsListening(false);
        setNotice('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setNotice(t('Không thể khởi động nhận diện giọng nói.'));
    }
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
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const switchKind = (next: InputKind) => {
    if (next === kind) return;
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

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    setNotice('');
    setLookup(null);
    if (!IMAGE_TYPES.split(',').includes(ext)) {
      setNotice(t('Chỉ hỗ trợ tệp .jpg, .jpeg, .png, .webp.'));
      return;
    }
    setFileName(file.name);
    setImageUrl(URL.createObjectURL(file));
    setSourceText('');
    setNotice(t('Chưa thể tự đọc chữ trong ảnh. Hãy nhập lại nội dung trong ảnh để dịch.'));
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    void handleImageFile(event.dataTransfer.files[0]);
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

  const dropzone = (accept: string, types: string) => (
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
          <button type="button" className="gt-btn" style={{ height: '35px', width: '300px' }} onClick={() => void pasteText()}>
            <ClipboardPaste size={16} style={{ verticalAlign: -3, marginRight: 6 }} />{t('Dán nội dung từ bảng nhớ tạm')}
          </button>
          <p className="gt-hint">{t('Các loại tệp được hỗ trợ')}: {types}</p>
          <input ref={fileInput} type="file" accept={accept} hidden onChange={(event) => { void handleImageFile(event.target.files?.[0]); event.target.value = ''; }} />
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

  return (
    <div className="gt-page">
      {/* Thanh chuyển đổi mode nhập */}
      <div 
        className="gt-modes" 
        role="tablist" 
        aria-label={t('Chọn cách nhập nội dung')}
        style={{ 
          display: 'inline-flex', 
          width: 'fit-content', 
          gap: '6px', 
          marginBottom: '16px',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px'
        }}
      >
        {kinds.map(({ id, label, icon: Icon }) => (
          <button 
            key={id} 
            type="button" 
            role="tab" 
            aria-selected={kind === id} 
            className={`gt-mode ${kind === id ? 'gt-mode-active' : ''}`} 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px', 
              minWidth: 'auto', 
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s ease'
            }}
            onClick={() => switchKind(id)}
          >
            <Icon size={18} /> {t(label)}
          </button>
        ))}
      </div>

      {/* Thanh ngôn ngữ */}
      {langBar}

      {/* Khung dịch văn bản */}
      {kind === 'text' && (
        <>
          <section className="gt-split gt-split-text" style={{ width: '100%' }}>
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
                <button 
                  type="button" 
                  className={`gt-icon ${isListening ? 'gt-icon-active' : ''}`} 
                  onClick={toggleSpeechRecognition} 
                  aria-label={t(isListening ? 'Dừng ghi âm' : 'Nhấn để nói')} 
                  title={t(isListening ? 'Dừng ghi âm' : 'Nhấn để nói')}
                >
                  <Mic size={20} color={isListening ? '#ef4444' : undefined} />
                </button>
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

      {/* Khung tải ảnh */}
      {kind === 'image' && dropzone(IMAGE_TYPES, '.jpg, .jpeg, .png, .webp')}

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