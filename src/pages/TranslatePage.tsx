import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Copy, FileText, Languages, Mic, RotateCcw, Send, Volume2, X,
} from 'lucide-react';
import { lookupPhrase } from '@/backend/api';
import { addStudyRecord } from '@/backend/study-history';
import { suggestedVocabulary } from '@/data/sampleDictionary';
import type { PhraseLookup, SourceLanguage } from '@/types/dictionary';
import type { User } from '@/types/auth';
import { useLanguage } from '@/i18n/useLanguage';

export function TranslatePage({ onNavigate, user }: { onNavigate: (route: 'vocabulary') => void; user: User | null }) {
  const { t } = useLanguage();
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>('tay');
  const [mode, setMode] = useState<'voice' | 'text'>('text');
  const [lookup, setLookup] = useState<PhraseLookup | null>(null);
  const [notice, setNotice] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [speakingWord, setSpeakingWord] = useState('');
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
        setNotice(t('Đã ghi âm xong. Có thể phát lại bản ghi bên dưới.'));
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

  const clearRecording = () => {
    setRecordingUrl('');
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
    setNotice(t('Bản chép lời đã được xóa.'));
  };

  const copyLookup = async () => {
    if (!lookup) return;
    const copiedText = lookup.segments
      .filter((segment) => segment.matched)
      .map((segment) => `${segment.source}: ${segment.meaning}`)
      .join('\n');
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

  const speakLookup = () => {
    if (!lookup) return;
    const meanings = lookup.segments.filter((segment) => segment.matched).map((segment) => segment.meaning);
    if (!meanings.length) {
      setNotice(t('Chưa có mục khớp trong từ điển.'));
      return;
    }
    if (!('speechSynthesis' in window)) {
      setNotice(t('Trình duyệt chưa hỗ trợ đọc thành tiếng.'));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(meanings.join('. '));
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);
  };

  const fillSuggestedWord = (word: string) => {
    setMode('text');
    setSourceText(word);
    setLookup(null);
    setNotice('');
  };

  const speakSuggestedWord = (word: string) => {
    if (!('speechSynthesis' in window)) {
      setNotice(t('Trình duyệt chưa hỗ trợ đọc thành tiếng.'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'vi-VN';
    utterance.onend = () => setSpeakingWord((current) => current === word ? '' : current);
    utterance.onerror = () => {
      setSpeakingWord((current) => current === word ? '' : current);
      setNotice(t('Không thể phát âm thanh trên thiết bị này.'));
    };
    setSpeakingWord(word);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="translate-page">
      <section className="page-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {t('Từ điển Tày/Mường')}</div>
          <h1>{t('Tra cứu từ vựng Tày - Mường')}<br /><em>{t('Hiểu đúng từng ngữ cảnh.')}</em></h1>
          <p>{t('Tra cứu từ vựng Tày - Mường, đối chiếu nghĩa và khám phá cách dùng theo ngữ cảnh.')}</p>
        </div>
      </section>

      <div className="mode-tabs" role="tablist" aria-label={t('Chọn cách nhập nội dung')}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'text'}
          className={mode === 'text' ? 'mode-tab-active' : ''}
          onClick={() => {
            if (isRecording) recorder.current?.stop();
            setMode('text');
            setLookup(null);
            setNotice('');
          }}
        >
          <FileText size={18} /> {t('Nhập văn bản')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'voice'}
          className={mode === 'voice' ? 'mode-tab-active' : ''}
          onClick={() => {
            if (isRecording) recorder.current?.stop();
            setMode('voice');
            setLookup(null);
            setNotice('');
          }}
        >
          <Mic size={18} /> {t('Ghi âm giọng nói')}
        </button>
      </div>

      <section className={`translation-workspace ${mode === 'voice' ? 'voice-workspace' : ''}`}>
        <div className="translation-panel source-panel">
          <div className="panel-header">
            <div className="panel-label"><span className="panel-icon">{mode === 'voice' ? <Mic size={18} /> : <FileText size={18} />}</span><strong>{t(mode === 'voice' ? 'Ghi âm tiếng địa phương' : 'Nhập văn bản')}</strong></div>
            <select
              className="language-select"
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
          </div>

          {mode === 'voice' && (
            <div className="voice-recorder">
              <button
                className={`voice-record-button ${isRecording ? 'recording-button' : ''}`}
                onClick={toggleRecording}
                aria-label={t(isRecording ? 'Dừng ghi âm' : recordingUrl ? 'Ghi âm lại' : 'Bắt đầu ghi âm')}
                aria-pressed={isRecording}
              >
                <Mic size={27} />
              </button>
              <strong>{t(isRecording ? 'Đang ghi âm...' : recordingUrl ? 'Đã ghi âm xong' : 'Chạm micro để bắt đầu ghi âm')}</strong>
              {recordingUrl && !isRecording && (
                <div className="recording-review">
                  <audio className="recording-playback" controls src={recordingUrl} />
                  <button className="quiet-button" onClick={clearRecording}><RotateCcw size={17} /> {t('Ghi âm lại')}</button>
                </div>
              )}
              <p>{t('Ghi âm giọng nói để nghe lại, sau đó nhập nội dung cần tra cứu.')}</p>
            </div>
          )}

          {mode === 'text' && (
            <div className="panel-body">
              <label htmlFor="source-text">{t('Nhập văn bản')}</label>
              <textarea
                id="source-text"
                value={sourceText}
                onChange={(event) => {
                  setSourceText(event.target.value);
                  setLookup(null);
                  setNotice('');
                }}
                placeholder={t('Nhập câu tiếng Tày hoặc tiếng Mường đã nghe...')}
                maxLength={200}
              />
              <div className="dictionary-quick-tags">
                <span>{t('Gợi ý tìm kiếm')}</span>
                {suggestedVocabulary.map(({ word }) => (
                  <button type="button" key={word} onClick={() => fillSuggestedWord(word)}>{word}</button>
                ))}
              </div>
            </div>
          )}

          {mode === 'text' && (
            <div className="panel-footer source-footer">
              <span className="capture-status"><span className="status-dot" />{t('Chỉ các mục đã tra mới được lưu vào lịch sử trên thiết bị.')}</span>
              <button className="quiet-button" onClick={clearTranscript} disabled={!sourceText}>
                <RotateCcw size={17} /> {t('Xóa nội dung')}
              </button>
            </div>
          )}
        </div>

        {mode === 'text' && <div className="swap-marker" aria-hidden="true"><ArrowRight size={18} /></div>}

        {mode === 'text' && <div className="translation-panel result-panel">
          <div className="panel-header">
            <div className="panel-label"><span className="panel-icon"><Languages size={18} /></span><strong>{t('Nghĩa tiếng Việt')}</strong></div>
            <span className="language-select">{t('Tiếng Việt')}</span>
          </div>
          <div className="panel-body result-body">
            {!lookup && (
              <div className="empty-result">
                <strong>{t('Kết quả tra cứu từ điển')}</strong>
                <p>{t('Nhập từ hoặc chọn một gợi ý để xem kết quả tra cứu tại đây.')}</p>
              </div>
            )}
            {lookup && lookup.segments.every((segment) => !segment.matched) && (
              <div className="empty-result">
                <strong>{t('Chưa có mục khớp trong từ điển.')}</strong>
                <p>{t('Không tự suy đoán nghĩa của từ chưa có trong từ điển.')}</p>
                <button className="quiet-button" onClick={() => onNavigate('vocabulary')}>
                  {t('Thêm mục từ đã kiểm chứng')}
                </button>
              </div>
            )}
            {lookup && lookup.segments.some((segment) => segment.matched) && (
              <div className="translation-matches" aria-live="polite">
                <div className="coverage-summary">
                  <strong>{lookup.coverage}%</strong>
                  <span>{t('Mức độ khớp')} · {lookup.matchedTokens}/{lookup.totalTokens} {t('từ')}</span>
                </div>
                {lookup.segments.map((segment, index) => (
                  <article className={`translation-match ${segment.matched ? '' : 'translation-unmatched'}`} key={`${segment.source}-${index}`}>
                    <div>
                      <strong>{segment.source}</strong>
                      {segment.partOfSpeech && <span>{segment.partOfSpeech}</span>}
                    </div>
                    <p>{segment.matched ? segment.meaning : t('Chưa có trong từ điển')}</p>
                    {segment.example && <small>{segment.example}</small>}
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="panel-footer result-footer">
            <span className="review-hint">{t('Kiểm tra nghĩa theo ngữ cảnh.')}</span>
            <div className="result-actions">
              <button className="quiet-button" onClick={speakLookup} disabled={!lookup}><Volume2 size={17} /> {t('Nghe')}</button>
              <button className="quiet-button" onClick={() => void copyLookup()} disabled={!lookup}><Copy size={17} /> {t('Sao chép')}</button>
            </div>
          </div>
        </div>}
      </section>

      {mode === 'text' && <div className="translate-actions">
        <div className="language-pair">
          <span className="language-pill"><span className="language-dot source-dot" />{t(sourceLanguage === 'tay' ? 'Tiếng Tày' : 'Tiếng Mường')}</span>
          <ArrowRight size={17} />
          <span className="language-pill"><span className="language-dot target-dot" />{t('Tiếng Việt')}</span>
        </div>
        <button className="primary-button" onClick={() => void runLookup()} disabled={isLookingUp}>
          <Send size={18} /> {t(isLookingUp ? 'Đang tra từ...' : 'Tra cứu từ điển')}
        </button>
      </div>}

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label={t('Đóng thông báo')}><X size={17} /></button>
        </div>
      )}

      <section className="dictionary-suggestions">
        <div className="dictionary-suggestions-heading">
          <div><div className="eyebrow"><span className="eyebrow-line" /> {t('Khám phá từ mới')}</div><h2>{t('Từ vựng gợi ý tra cứu')}</h2></div>
          <p>{t('Chọn một từ để đưa vào khung tra cứu.')}</p>
        </div>
        <p className="dictionary-sample-note">{t('Nghĩa tham khảo được viết sẵn để minh họa và có thể thay đổi theo phương ngữ.')}</p>
        <div className="dictionary-word-grid">
          {suggestedVocabulary.map(({ word, meaning }, index) => (
            <article className={`dictionary-word-card dictionary-word-card-${index + 1}`} key={word}>
              <div className="dictionary-word-card-top"><span>{t('Từ gợi ý')}</span><span>0{index + 1}</span></div>
              <strong>{word}</strong>
              <span className="dictionary-word-meaning-label">{t('Nghĩa tham khảo')}</span>
              <p>{t(meaning)}</p>
              <div className="dictionary-word-card-actions">
                <button type="button" onClick={() => fillSuggestedWord(word)}>{t('Tra từ')} <ArrowRight size={17} /></button>
                <button
                  type="button"
                  className={speakingWord === word ? 'dictionary-audio-playing' : ''}
                  aria-label={t(speakingWord === word ? 'Đang phát âm' : 'Nghe cách đọc')}
                  aria-pressed={speakingWord === word}
                  title={t('Bản đọc bằng giọng tổng hợp trên thiết bị')}
                  onClick={() => speakSuggestedWord(word)}
                  disabled={speakingWord === word}
                >
                  <Volume2 size={20} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
