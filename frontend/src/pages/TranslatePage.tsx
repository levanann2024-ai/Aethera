import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight, BookOpen, ClipboardPaste, Copy, FileText, History, Image as ImageIcon,
  Languages, Mic, Search, Star, UploadCloud, Volume2, X
} from 'lucide-react';
import { getSettings } from '@/services/settings';
import { translateText } from '@/services/api';
import type { TranslationMethod } from '@/services/api';
import { addStudyRecord } from '@/services/study-history';
import { suggestedVocabularyByLang } from '@/data/sampleDictionary';
import type { DictionaryMeaning, PhraseLookup, SourceLanguage } from '@/types/dictionary';
import type { User } from '@/types/auth';
import type { Route } from '@/types/navigation';
import { useLanguage } from '@/i18n/useLanguage';
import './translate.css';

type InputKind = 'text' | 'image';

interface SpeechRecognitionResultLike {
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const MAX_LENGTH = 2000;
const IMAGE_TYPES = '.jpg,.jpeg,.png,.webp';
const TTS_MAX_CHUNK_LENGTH = 180;

function splitSpeechText(text: string): string[] {
  const words = text.match(/\S+/g) ?? [];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const word of words) {
    const nextChunk = currentChunk ? `${currentChunk} ${word}` : word;
    if (nextChunk.length > TTS_MAX_CHUNK_LENGTH && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = word;
    } else {
      currentChunk = nextChunk;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

const kinds: { id: InputKind; label: string; icon: typeof Languages }[] = [
  { id: 'text', label: 'Văn bản', icon: Languages },
  { id: 'image', label: 'Hình ảnh', icon: ImageIcon }
];

export function TranslatePage({ user, onNavigate }: { onNavigate?: (route: Route) => void; user: User | null }) {
  const { t } = useLanguage();
  const [kind, setKind] = useState<InputKind>('text');
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>(() => (
    user?.targetLanguage === 'tay' || user?.targetLanguage === 'muong'
      ? user.targetLanguage
      : getSettings().defaultLanguage
  ));
  const [reverseDirection, setReverseDirection] = useState(false);
  const [lookup, setLookup] = useState<PhraseLookup | null>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [meaningGroups, setMeaningGroups] = useState<DictionaryMeaning[] | null>(null);
  const [translationMethod, setTranslationMethod] = useState<TranslationMethod | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [notice, setNotice] = useState('');
  const [fileName, setFileName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageReady, setImageReady] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [showOriginalImage, setShowOriginalImage] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const speechAudio = useRef<HTMLAudioElement | null>(null);
  const speechRequestId = useRef(0);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      speechRequestId.current += 1;
      speechAudio.current?.pause();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Could not stop speech recognition during cleanup.', error);
        }
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
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

      recognition.onresult = (event) => {
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
      setTranslatedText('');
      setMeaningGroups(null);
      setTranslationMethod(null);
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await translateText(text, sourceLanguage, reverseDirection);
        if (cancelled) return;
        const totalTokens = text.split(/\s+/).filter(Boolean).length;
        const hasVerifiedTranslation = result.method === 'database' || result.method === 'external_api';
        const phraseLookup: PhraseLookup = {
          language: sourceLanguage,
          segments: [{
            source: text,
            meaning: result.translatedText,
            partOfSpeech: '',
            example: '',
            matched: hasVerifiedTranslation,
          }],
          matchedTokens: hasVerifiedTranslation ? totalTokens : 0,
          totalTokens,
          coverage: hasVerifiedTranslation ? 100 : 0,
        };
        setTranslatedText(result.translatedText);
        setMeaningGroups(result.meanings ?? null);
        setTranslationMethod(result.method);
        setLookup(phraseLookup);
        setIsTranslating(false);
        setNotice('');
        if (result.translatedText) {
          try {
            addStudyRecord(text, phraseLookup, user?.id);
          } catch {
            setNotice(t('Tra cứu xong nhưng không thể lưu lịch sử trên thiết bị này.'));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setIsTranslating(false);
          setNotice(error instanceof Error ? error.message : t('Không thể tải từ điển.'));
        }
      }
    }, 350);
    setLookup(null);
    setTranslatedText('');
    setMeaningGroups(null);
    setTranslationMethod(null);
    setIsTranslating(true);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText, sourceLanguage, reverseDirection, user?.id]);

  const matchedSegments = lookup?.segments.filter((segment) => segment.matched) ?? [];
  const translation = translatedText || matchedSegments.map((segment) => segment.meaning).join(' · ');

  const lookupCrossReference = (word: string) => {
    setKind('text');
    setSourceLanguage('tay');
    setReverseDirection(false);
    setSourceText(word);
    setLookup(null);
    setTranslatedText('');
    setMeaningGroups(null);
    setTranslationMethod(null);
    setNotice('');
  };

  const meaningEntries = meaningGroups?.flatMap((group, groupIndex) => (
    (group.definitions ?? []).map((definition, definitionIndex) => ({
      group,
      groupIndex,
      definition,
      definitionIndex,
    }))
  )) ?? [];
  const primaryMeaning = meaningEntries[0];
  const alternativeMeanings = new Map<string, { partOfSpeech: string; definitions: string[] }>();
  meaningEntries.slice(1).forEach(({ group, definition }) => {
    const partOfSpeech = group.part_of_speech || 'Khác';
    const alternatives = alternativeMeanings.get(partOfSpeech) ?? { partOfSpeech, definitions: [] };
    alternatives.definitions.push(definition);
    alternativeMeanings.set(partOfSpeech, alternatives);
  });

  const renderDefinition = (definition: string, key: string) => {
    const crossReference = definition.match(/^x\.\s*(.+)$/i);
    if (!crossReference) return definition;

    const word = crossReference[1].trim();
    return (
      <span key={key}>
        x.{' '}
        <button
          type="button"
          className="gt-cross-reference"
          onClick={() => lookupCrossReference(word)}
          aria-label={`${t('Tra cứu từ')} ${word}`}
        >
          {word}
        </button>
      </span>
    );
  };

  const runAdvancedTranslation = async () => {
    const text = sourceText.trim();
    if (!text || isTranslating) return;
    setIsTranslating(true);
    setNotice('');
    try {
      const result = await translateText(text, sourceLanguage, reverseDirection, true);
      if (text !== sourceText.trim()) return;
      const totalTokens = text.split(/\s+/).filter(Boolean).length;
      const phraseLookup: PhraseLookup = {
        language: sourceLanguage,
        segments: [{
          source: text,
          meaning: result.translatedText,
          partOfSpeech: '',
          example: '',
          matched: result.method === 'gemini_ai',
        }],
        matchedTokens: result.method === 'gemini_ai' ? totalTokens : 0,
        totalTokens,
        coverage: result.method === 'gemini_ai' ? 100 : 0,
      };
      setTranslatedText(result.translatedText);
      setMeaningGroups(result.meanings ?? null);
      setTranslationMethod(result.method);
      setLookup(phraseLookup);
      if (result.translatedText) {
        try {
          addStudyRecord(text, phraseLookup, user?.id);
        } catch {
          setNotice(t('Tra cứu xong nhưng không thể lưu lịch sử trên thiết bị này.'));
        }
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('Không thể tải từ điển.'));
    } finally {
      setIsTranslating(false);
    }
  };

  const resetInput = () => {
    setSourceText('');
    setLookup(null);
    setTranslatedText('');
    setMeaningGroups(null);
    setTranslationMethod(null);
    setIsTranslating(false);
    setNotice('');
    setFileName('');
    setImageUrl('');
    setImageReady(false);
    setImageLoadError(false);
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
    setTranslatedText('');
    setMeaningGroups(null);
    setTranslationMethod(null);
    setIsTranslating(false);
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

  const pasteImage = async () => {
    if (!navigator.clipboard?.read) {
      setNotice(t('Trình duyệt chưa hỗ trợ dán ảnh từ bộ nhớ tạm.'));
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const extension = imageType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        const file = new File([blob], `clipboard-image.${extension}`, { type: imageType });
        await handleImageFile(file);
        return;
      }
      setNotice(t('Không tìm thấy ảnh trong bộ nhớ tạm.'));
    } catch {
      setNotice(t('Không thể đọc ảnh từ bộ nhớ tạm trên thiết bị này.'));
    }
  };

  const copyLookup = async () => {
    if (!translatedText) {
      setNotice(t('Chưa có nội dung để sao chép.'));
      return;
    }
    try {
      await navigator.clipboard.writeText(translatedText);
      setNotice(t('Đã sao chép'));
    } catch {
      setNotice(t('Không thể sao chép nội dung trên thiết bị này.'));
    }
  };

  const speak = (text: string) => {
    if (!text.trim()) {
      setNotice(t('Chưa có nội dung để đọc.'));
      return;
    }

    speechRequestId.current += 1;
    const requestId = speechRequestId.current;
    speechAudio.current?.pause();
    setNotice('');

    const chunks = splitSpeechText(text);
    let chunkIndex = 0;
    const playNextChunk = () => {
      if (requestId !== speechRequestId.current || chunkIndex >= chunks.length) return;
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunks[chunkIndex])}&tl=vi&client=tw-ob`;
      const audio = new Audio(audioUrl);
      speechAudio.current = audio;
      audio.onended = () => {
        chunkIndex += 1;
        playNextChunk();
      };
      audio.onerror = () => {
        if (requestId === speechRequestId.current) {
          setNotice(t('Không thể phát giọng đọc trực tuyến. Hãy kiểm tra kết nối mạng rồi thử lại.'));
        }
      };
      void audio.play().catch(() => {
        if (requestId === speechRequestId.current) {
          setNotice(t('Không thể phát giọng đọc trực tuyến. Hãy kiểm tra kết nối mạng rồi thử lại.'));
        }
      });
    };

    playNextChunk();
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
    setImageReady(false);
    setImageLoadError(false);
    const nextImageUrl = URL.createObjectURL(file);
    setImageUrl(nextImageUrl);
    setSourceText('');
    const previewImage = new Image();
    previewImage.onload = () => setImageReady(true);
    previewImage.onerror = () => {
      setImageReady(false);
      setImageLoadError(true);
      setNotice(t('Không thể tải ảnh này. Vui lòng thử một tệp khác.'));
    };
    previewImage.src = nextImageUrl;
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
        {isTranslating && (
          <div className="gt-translation-loading" role="status" aria-label={t('Đang dịch...')}>
            <span />
            <span />
            <span />
          </div>
        )}
        {!isTranslating && !lookup && (
          <div className="gt-empty"><BookOpen size={28} strokeWidth={1.4} /><span>{t('Bản dịch sẽ hiển thị ở đây')}</span></div>
        )}
        {!isTranslating && translationMethod === 'advanced_required' && (
          <div className="gt-advanced-prompt">
            <span>{t('Cần dịch nâng cao cho nội dung này.')}</span>
            <button type="button" className="gt-advanced-button" onClick={() => void runAdvancedTranslation()}>
              <Search size={17} />
              {t('Dịch nâng cao')}
            </button>
          </div>
        )}
        {!isTranslating && translationMethod !== 'advanced_required' && lookup && !translatedText && !matchedSegments.length && (
          <div className="gt-empty"><BookOpen size={28} strokeWidth={1.4} /><span>{t('Chưa có mục khớp trong từ điển.')}</span></div>
        )}
        {!isTranslating && translatedText && (
          <>
            <p className="gt-result-main">
              {primaryMeaning
                ? renderDefinition(primaryMeaning.definition, 'primary-meaning')
                : meaningGroups
                  ? sourceText
                  : translation}
            </p>
            {primaryMeaning?.group.part_of_speech && (
              <span className="gt-primary-pos">{primaryMeaning.group.part_of_speech}</span>
            )}
            {translationMethod === 'gemini_ai' && (
              <span className="gt-ai-badge">{t('✨ Được dịch bởi AI')}</span>
            )}
            {alternativeMeanings.size > 0 && (
              <section className="gt-alternative-meanings" aria-label={t('Bản dịch khác')}>
                <h3>{t('Bản dịch khác')}</h3>
                <ul>
                  {[...alternativeMeanings.values()].map(({ partOfSpeech, definitions }) => (
                    <li key={partOfSpeech}>
                      <strong>{partOfSpeech}:</strong>
                      <span>
                        {definitions.map((definition, index) => (
                          <span key={`${partOfSpeech}-${index}`}>
                            {index > 0 && '; '}
                            {renderDefinition(definition, `${partOfSpeech}-${index}-definition`)}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {!reverseDirection && !meaningGroups && matchedSegments.length > 0 && (
              <ul className="gt-parts">
                {lookup?.segments.map((segment, index) => (
                  <li key={`${segment.source}-${index}`}>
                    <strong>{segment.source}</strong>
                    <span>{segment.meaning}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <div className="gt-toolbar">
        <button 
              type="button" 
              className="gt-icon" 
              onClick={() => void speak(translation)} 
              aria-label={t('Nghe')} 
              title={t('Nghe')}
            >
              <Volume2 size={40} />
            </button>
        <span className="gt-toolbar-spacer" />
        <button type="button" className="gt-icon" onClick={() => void copyLookup()} disabled={!translatedText || isTranslating} aria-label={t('Sao chép')} title={t('Sao chép')}><Copy size={20} /></button>
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
          <div className="gt-cloud"><UploadCloud size={56} /></div>
          <span className="gt-drop-title">{t('Kéo và thả')}</span>
        </div>
        <div className="gt-drop-right">
          <h3>{t('Hoặc chọn một tệp')}</h3>
          <button type="button" className="gt-btn gt-btn-primary" onClick={() => fileInput.current?.click()}>{t('Duyệt qua các tệp')}</button>
          <button type="button" className="gt-btn gt-btn-paste-image" onClick={() => void pasteImage()}>
            <ClipboardPaste size={16} />{t('Dán tệp từ bảng nhớ tạm')}
          </button>
          <p className="gt-hint">{t('Các loại tệp được hỗ trợ')}: {types}</p>
          <input ref={fileInput} type="file" accept={accept} hidden onChange={(event) => { void handleImageFile(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
      </section>
    </>
  );

  return (
    <div className={`gt-page ${kind === 'image' ? 'gt-page-image' : ''}`}>
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
                <button 
                    type="button" 
                    className="gt-icon" 
                    onClick={() => void speak(sourceText)} 
                    aria-label={t('Nghe')} 
                    title={t('Nghe')}
                  >
                    <Volume2 size={20} />
                 </button>
                <button type="button" className="gt-icon" onClick={() => void pasteText()} aria-label={t('Dán văn bản')} title={t('Dán văn bản')}><ClipboardPaste size={20} /></button>
                <span className="gt-toolbar-spacer" />
                <span className="gt-count">{sourceText.length} / {MAX_LENGTH}</span>
              </div>
            </div>
            {resultPanel}
          </section>
          <div className="gt-chips" aria-label={t('Gợi ý từ điển')}>
            <span className="gt-chips-label">{t('Gợi ý từ điển')}:</span>
            {suggestedVocabularyByLang[sourceLanguage].map(({ word, meaning }) => {
              const value = reverseDirection ? word : meaning;
              const translation = reverseDirection ? meaning : word;
              return (
                <button
                  key={word}
                  type="button"
                  className="gt-chip"
                  title={translation}
                  onClick={() => setSourceText(value)}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Khung tải ảnh */}
      {kind === 'image' && (
        imageUrl ? (
          <section className={`gt-image-result ${showOriginalImage ? '' : 'gt-image-result-single'}`}>
            <div className="gt-image-toolbar">
              <label className="gt-original-toggle">
                <span>{t('Hiện bản gốc')}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={showOriginalImage}
                  onChange={(event) => setShowOriginalImage(event.target.checked)}
                  aria-label={t('Hiện bản gốc')}
                />
              </label>
              <span className="gt-image-file"><FileText size={16} />{fileName}</span>
              <button type="button" className="gt-image-action" onClick={() => fileInput.current?.click()}>
                <UploadCloud size={16} />{t('Chọn ảnh khác')}
              </button>
              <button type="button" className="gt-image-action gt-image-close" onClick={resetInput} aria-label={t('Xóa ảnh')} title={t('Xóa ảnh')}>
                <X size={18} />
              </button>
              <input ref={fileInput} type="file" accept={IMAGE_TYPES} hidden onChange={(event) => { void handleImageFile(event.target.files?.[0]); event.target.value = ''; }} />
            </div>
            {!imageReady && !imageLoadError ? (
              <div className="gt-image-loading" role="status" aria-live="polite">
                <span className="gt-spinner" />
                <span>{t('Đang tải ảnh...')}</span>
              </div>
            ) : imageLoadError ? (
              <div className="gt-image-loading" role="status">
                <span>{t('Không thể tải ảnh này. Vui lòng thử một tệp khác.')}</span>
                <button type="button" className="gt-btn gt-btn-primary" onClick={() => fileInput.current?.click()}>{t('Chọn ảnh khác')}</button>
              </div>
            ) : (
              <>
                <div className="gt-image-panels">
                  {showOriginalImage && (
                    <div className="gt-image-panel">
                      <div className="gt-image-panel-title">{t('Bản gốc')}</div>
                      <div className="gt-image-frame">
                        <img src={imageUrl} alt={`${t('Bản gốc')}: ${fileName}`} />
                      </div>
                    </div>
                  )}
                  <div className="gt-image-panel">
                    <div className="gt-image-panel-title">{t('Ảnh đã dịch')} <span>{t('Bản xem trước')}</span></div>
                    <div className="gt-image-frame">
                      <img
                        src={imageUrl}
                        alt={`${t('Bản xem trước chưa dịch')}: ${fileName}`}
                        onLoad={() => setImageReady(true)}
                        onError={() => {
                          setImageReady(false);
                          setImageLoadError(true);
                          setNotice(t('Không thể tải ảnh này. Vui lòng thử một tệp khác.'));
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="gt-image-notice" role="status">
                  {t('Dịch ảnh chưa khả dụng. Ảnh bên phải vẫn là bản gốc; đây chỉ là bản xem trước.')}
                </div>
              </>
            )}
          </section>
        ) : dropzone(IMAGE_TYPES, '.jpg, .jpeg, .png, .webp')
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