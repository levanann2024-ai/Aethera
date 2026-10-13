import { getSettings } from '@/backend/settings';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BookOpen, ClipboardPaste, Copy, Keyboard, Mic, Search, Square, Volume2, X,
} from 'lucide-react';
import { lookupPhrase } from '@/backend/api';
import { addStudyRecord } from '@/backend/study-history';
import { suggestedVocabulary } from '@/data/sampleDictionary';
import type { PhraseLookup, SourceLanguage } from '@/types/dictionary';
import type { User } from '@/types/auth';
import { useLanguage } from '@/i18n/useLanguage';

const waveformBars = Array.from({ length: 44 }, (_, index) => 6 + Math.round(Math.abs(Math.sin(index * 0.9) * Math.cos(index * 0.31)) * 22));

export function TranslatePage({ user }: { onNavigate?: (route: 'vocabulary') => void; user: User | null }) {
  const { t } = useLanguage();
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>(() => getSettings().defaultLanguage);
  const [mode, setMode] = useState<'voice' | 'text'>('text');
  const [lookup, setLookup] = useState<PhraseLookup | null>(null);
  const [notice, setNotice] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
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

  const switchMode = (nextMode: 'voice' | 'text') => {
    if (isRecording) recorder.current?.stop();
    setMode(nextMode);
    setLookup(null);
    setNotice('');
  };

  const runLookup = async () => {
    const text = sourceText.trim();
    if (!text) {
      setNotice(t('Nhập câu tiếng Tày hoặc tiếng Mường đã nghe...'));
      return;
    }

    setIsLookingUp(true);
    setNotice('');
    setLookup(null);
    try {
      const result = await lookupPhrase(sourceLanguage, text);
      setLookup(result);
      try {
        addStudyRecord(text, result, user?.id);
      } catch {
        setNotice(t('Tra cứu xong nhưng không thể lưu lịch sử trên thiết bị này.'));
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('Không thể tải từ điển.'));
    } finally {
      setIsLookingUp(false);
    }
  };

  const clearTranscript = () => {
    setSourceText('');
    setLookup(null);
    setNotice('');
  };

  const pasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSourceText(text.slice(0, 200));
        setLookup(null);
      }
    } catch {
      setNotice(t('Không thể đọc nội dung từ bộ nhớ tạm trên thiết bị này.'));
    }
  };

  const matchedSegments = lookup?.segments.filter((segment) => segment.matched) ?? [];

  const copyLookup = async () => {
    if (!lookup) return;
    const copiedText = matchedSegments.map((segment) => `${segment.source}: ${segment.meaning}`).join('\n');
    if (!copiedText) {
      setNotice(t('Chưa có mục khớp trong từ điển.'));
      return;
    }

    try {
      await navigator.clipboard.writeText(copiedText);
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

  const speakLookup = () => {
    if (!matchedSegments.length) {
      setNotice(t('Chưa có mục khớp trong từ điển.'));
      return;
    }
    speak(matchedSegments.map((segment) => segment.meaning).join('. '), 'vi-VN');
  };

  const fillSuggestedWord = (word: string) => {
    setSourceText(word);
    setLookup(null);
    setNotice('');
  };

  const languageSelect = (
    <select
      className="tr-select"
      value={sourceLanguage}
      onChange={(event) => {
        setSourceLanguage(event.target.value as SourceLanguage);
        setLookup(null);
      }}
      aria-label={t('Ngôn ngữ nguồn')}
    >
      <option value="tay">{t('Tày')}</option>
      <option value="muong">{t('Mường')}</option>
    </select>
  );

  const resultContent = (
    <>
      {!lookup && (
        <div className="tr-placeholder">
          <BookOpen size={42} strokeWidth={1.4} />
          <span>{t('Bản dịch sẽ hiển thị ở đây')}</span>
        </div>
      )}
      {lookup && !matchedSegments.length && (
        <div className="tr-placeholder">
          <BookOpen size={42} strokeWidth={1.4} />
          <span>{t('Chưa có mục khớp trong từ điển.')}</span>
        </div>
      )}
      {lookup && matchedSegments.length > 0 && (
        <ul className="tr-matches" aria-live="polite">
          {lookup.segments.map((segment, index) => (
            <li key={`${segment.source}-${index}`} className={segment.matched ? '' : 'tr-match-missing'}>
              <strong>{segment.source}</strong>
              <span>{segment.matched ? segment.meaning : t('Chưa có trong từ điển')}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <div className="tr-page">
      <header className="tr-head">
        <h1>{t(mode === 'voice' ? 'Dịch bằng giọng nói' : 'Dịch & tra từ')}</h1>
        <p>{t(mode === 'voice' ? 'Nói bằng tiếng Tày–Mường, ứng dụng sẽ chuyển thành bản dịch Quốc ngữ.' : 'Nhập câu tiếng Tày–Mường để nhận bản dịch Quốc ngữ.')}</p>
      </header>

      <div className="tr-tabs" role="tablist" aria-label={t('Chọn cách nhập nội dung')}>
        <button type="button" role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'tr-tab-active' : ''} onClick={() => switchMode('text')}>
          <Keyboard size={16} /> {t('Nhập văn bản')}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'voice'} className={mode === 'voice' ? 'tr-tab-active' : ''} onClick={() => switchMode('voice')}>
          <Mic size={16} /> {t('Giọng nói')}
        </button>
      </div>

      {mode === 'text' && (
        <>
          <section className="tr-split">
            <div className="tr-panel">
              <div className="tr-panel-head">
                <strong>{t('Nhập văn bản')}</strong>
                {languageSelect}
              </div>
              <div className="tr-box tr-box-input">
                <textarea
                  id="source-text"
                  value={sourceText}
                  onChange={(event) => {
                    setSourceText(event.target.value);
                    setLookup(null);
                    setNotice('');
                  }}
                  placeholder={t('Nhập câu hoặc đoạn văn cần dịch...')}
                  aria-label={t('Nhập văn bản')}
                  maxLength={200}
                />
                <div className="tr-box-tools">
                  <button type="button" className="tr-icon-button" onClick={() => void pasteText()} aria-label={t('Dán văn bản')}><ClipboardPaste size={17} /></button>
                  <button type="button" className="tr-icon-button" onClick={clearTranscript} disabled={!sourceText} aria-label={t('Xóa nội dung')}><X size={17} /></button>
                </div>
              </div>
            </div>

            <div className="tr-panel">
              <div className="tr-panel-head">
                <strong>{t('Nghĩa tiếng Việt')}</strong>
                <span className="tr-select tr-select-static">{t('Quốc ngữ')}</span>
              </div>
              <div className="tr-box tr-box-result">{resultContent}</div>
              <div className="tr-result-actions">
                <button type="button" onClick={speakLookup} disabled={!matchedSegments.length}><Volume2 size={16} /> {t('Nghe')}</button>
                <button type="button" onClick={() => void copyLookup()} disabled={!matchedSegments.length}><Copy size={16} /> {t('Sao chép')}</button>
              </div>
            </div>
          </section>

          <button type="button" className="tr-submit" onClick={() => void runLookup()} disabled={isLookingUp}>
            <Search size={18} /> {t(isLookingUp ? 'Đang tra từ...' : 'Tra từ / Dịch')}
          </button>

          <div className="tr-chips">
            {suggestedVocabulary.map(({ word }) => (
              <button type="button" key={word} onClick={() => fillSuggestedWord(word)}>{word}</button>
            ))}
          </div>
        </>
      )}

      {mode === 'voice' && (
        <div className="tr-voice-body">
          <div className="tr-lang-row">
            {languageSelect}
            <ArrowRight size={22} />
            <span>{t('Quốc ngữ')}</span>
          </div>

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
                onChange={(event) => {
                  setSourceText(event.target.value);
                  setLookup(null);
                  setNotice('');
                }}
                placeholder={t('Nhập lại nội dung bạn vừa nói để tra nghĩa')}
                aria-label={t('Nội dung đã nghe')}
                maxLength={200}
              />
              <button type="button" className="tr-link-button" onClick={() => speak(sourceText, 'vi-VN')} disabled={!sourceText.trim()}><Volume2 size={15} /> {t('Nghe')}</button>
            </div>
          </section>

          <section className="tr-line-card tr-line-card-warm">
            <span className="tr-line-label">{t('Bản dịch Quốc ngữ')}</span>
            <div className="tr-line-row">
              <div className="tr-line-result">{lookup && matchedSegments.length > 0 ? matchedSegments.map((segment) => segment.meaning).join(' · ') : resultContent}</div>
              <button type="button" className="tr-link-button" onClick={() => void copyLookup()} disabled={!matchedSegments.length}><Copy size={15} /> {t('Sao chép')}</button>
            </div>
          </section>

          <button type="button" className="tr-submit tr-submit-yellow" onClick={() => void runLookup()} disabled={isLookingUp || isRecording}>
            {t(isLookingUp ? 'Đang tra từ...' : lookup ? 'Dịch lại' : 'Dịch')}
          </button>
        </div>
      )}

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label={t('Đóng thông báo')}><X size={17} /></button>
        </div>
      )}
    </div>
  );
}
