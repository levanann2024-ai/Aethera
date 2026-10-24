import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight, BookOpen, ClipboardPaste, Copy, FileText, History, Image as ImageIcon,
  Languages, Mic, Search, Star, UploadCloud, Volume2, X
} from 'lucide-react';
import { getSettings, voiceRate } from '@/services/settings';
import { transcribeAudio, translateImage, translateText } from '@/services/api';
import type { TranslationMethod } from '@/services/api';
import type { ImageTranslationRegion } from '@/services/api';
import { addStudyRecord } from '@/services/study-history';
import { suggestedVocabularyByLang } from '@/data/sampleDictionary';
import type { DictionaryMeaning, PhraseLookup, SourceLanguage } from '@/types/dictionary';
import type { User } from '@/types/auth';
import type { Route } from '@/types/navigation';
import { useLanguage } from '@/i18n/useLanguage';
import './translate.css';

type InputKind = 'text' | 'image';

const MAX_LENGTH = 2000;
const IMAGE_TYPES = '.jpg,.jpeg,.png,.webp';
const TTS_MAX_CHUNK_LENGTH = 180;
const MAX_RECORDING_DURATION_MS = 30_000;
const SPEECH_SAMPLE_RATE = 16_000;

interface RecordingSession {
  stream: MediaStream;
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  mutedOutput: GainNode;
  samples: Float32Array[];
}

declare global {
  interface Permissions {
    query(permissionDesc: { name: 'microphone' }): Promise<PermissionStatus>;
  }
}

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

function sampleImageBackgrounds(
  image: HTMLImageElement | null,
  regions: ImageTranslationRegion[],
): ImageTranslationRegion[] {
  if (!image?.complete || !image.naturalWidth || regions.length === 0) return regions;

  const scale = Math.min(1, 1500 / image.naturalWidth, 1500 / image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return regions;

  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixelAt = (x: number, y: number) => {
      const offset = (Math.max(0, Math.min(canvas.height - 1, y)) * canvas.width
        + Math.max(0, Math.min(canvas.width - 1, x))) * 4;
      return [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
    };
    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    return regions.map((region) => {
      const [top, left, bottom, right] = region.box;
      const x1 = Math.round(left / 1000 * canvas.width);
      const y1 = Math.round(top / 1000 * canvas.height);
      const x2 = Math.round(right / 1000 * canvas.width);
      const y2 = Math.round(bottom / 1000 * canvas.height);
      const gap = Math.max(2, Math.min(8, Math.round(Math.min(x2 - x1, y2 - y1) * 0.04)));
      const points = [
        [Math.round((x1 + x2) / 2), y1 - gap],
        [x1 - gap, Math.round((y1 + y2) / 2)],
        [x2 + gap, Math.round((y1 + y2) / 2)],
        [Math.round((x1 + x2) / 2), y2 + gap],
        [x1 - gap, y1 - gap],
        [x2 + gap, y1 - gap],
        [x1 - gap, y2 + gap],
        [x2 + gap, y2 + gap],
      ];
      const samples = points.map(([x, y]) => pixelAt(x, y));
      const channels = [0, 1, 2].map((channel) => median(samples.map((sample) => sample[channel])));
      const backgroundColor = `rgb(${channels.join(', ')})`;
      const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      return {
        ...region,
        backgroundColor,
        textColor: luminance > 150 ? '#202124' : '#fff',
      };
    });
  } catch (error) {
    console.warn('Could not sample image backgrounds for translation labels.', error);
    return regions;
  }
}

function encodeWav(samples: Float32Array[], sampleRate: number): Blob {
  const sampleCount = samples.reduce((total, chunk) => total + chunk.length, 0);
  const input = new Float32Array(sampleCount);
  let inputOffset = 0;
  for (const chunk of samples) {
    input.set(chunk, inputOffset);
    inputOffset += chunk.length;
  }

  const outputCount = Math.ceil(sampleCount * SPEECH_SAMPLE_RATE / sampleRate);
  const buffer = new ArrayBuffer(44 + outputCount * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + outputCount * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SPEECH_SAMPLE_RATE, true);
  view.setUint32(28, SPEECH_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, outputCount * 2, true);

  for (let index = 0; index < outputCount; index += 1) {
    const sourcePosition = index * sampleRate / SPEECH_SAMPLE_RATE;
    const leftIndex = Math.floor(sourcePosition);
    const rightIndex = Math.min(leftIndex + 1, sampleCount - 1);
    const fraction = sourcePosition - leftIndex;
    const sample = input[leftIndex] * (1 - fraction) + input[rightIndex] * fraction;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function disposeRecordingSession(session: RecordingSession): void {
  session.processor.onaudioprocess = null;
  session.source.disconnect();
  session.processor.disconnect();
  session.mutedOutput.disconnect();
  session.stream.getTracks().forEach((track) => track.stop());
  void session.audioContext.close().catch((error: unknown) => {
    console.error('Could not close microphone audio context.', error);
  });
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageTranslation, setImageTranslation] = useState<ImageTranslationRegion[] | null>(null);
  const [imageTranslationWarning, setImageTranslationWarning] = useState('');
  const [isImageTranslating, setIsImageTranslating] = useState(false);
  const imageTranslationRequestId = useRef(0);
  const [showOriginalImage, setShowOriginalImage] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const sourceImageElement = useRef<HTMLImageElement | null>(null);
  const speechRequestId = useRef(0);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [isCheckingMicrophone, setIsCheckingMicrophone] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingSession = useRef<RecordingSession | null>(null);
  const recordingTimer = useRef<number | null>(null);
  const transcriptionRequestId = useRef(0);
  const mounted = useRef(true);

  const cancelTranscription = () => {
    transcriptionRequestId.current += 1;
    setIsTranscribing(false);
  };

  const cancelImageTranslation = () => {
    imageTranslationRequestId.current += 1;
    setIsImageTranslating(false);
    setImageTranslationWarning('');
  };

  const discardRecording = () => {
    if (recordingTimer.current !== null) {
      window.clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }
    const session = recordingSession.current;
    recordingSession.current = null;
    if (session) disposeRecordingSession(session);
    setIsListening(false);
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      speechRequestId.current += 1;
      transcriptionRequestId.current += 1;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (recordingTimer.current !== null) window.clearTimeout(recordingTimer.current);
      const session = recordingSession.current;
      recordingSession.current = null;
      if (session) disposeRecordingSession(session);
    };
  }, []);

  const transcribeRecordedAudio = async (audio: Blob) => {
    transcriptionRequestId.current += 1;
    const requestId = transcriptionRequestId.current;
    setIsTranscribing(true);
    setNotice(t('Đang chuyển giọng nói thành văn bản...'));
    try {
      const transcript = await transcribeAudio(audio, sourceLanguage, reverseDirection);
      if (!mounted.current || requestId !== transcriptionRequestId.current) return;
      if (!transcript) {
        setNotice(t('Không nhận được giọng nói. Hãy nói rõ hơn rồi thử lại.'));
        return;
      }
      setSourceText((current) => `${current.trim()} ${transcript}`.trim().slice(0, MAX_LENGTH));
      setNotice('');
    } catch (error) {
      if (mounted.current && requestId === transcriptionRequestId.current) {
        setNotice(error instanceof Error ? t(error.message) : t('Không thể nhận diện giọng nói.'));
      }
    } finally {
      if (mounted.current && requestId === transcriptionRequestId.current) setIsTranscribing(false);
    }
  };

  const stopRecording = () => {
    const session = recordingSession.current;
    if (!session) return;
    recordingSession.current = null;
    if (recordingTimer.current !== null) {
      window.clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }
    disposeRecordingSession(session);
    setIsListening(false);
    if (!session.samples.length) {
      setNotice(t('Không nhận được giọng nói. Hãy nói rõ hơn rồi thử lại.'));
      return;
    }
    void transcribeRecordedAudio(encodeWav(session.samples, session.audioContext.sampleRate));
  };

  const toggleSpeechRecording = async () => {
    if (isListening) {
      stopRecording();
      return;
    }
    if (isCheckingMicrophone || isTranscribing) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice(t('Không thể truy cập microphone. Hãy cấp quyền microphone hoặc nhập văn bản.'));
      return;
    }
    if (!('AudioContext' in window)) {
      setNotice(t('Trình duyệt chưa hỗ trợ ghi âm.'));
      return;
    }

    setIsCheckingMicrophone(true);
    setNotice(t('Đang kiểm tra quyền microphone...'));

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    try {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        if (permission.state === 'denied') {
          setNotice(t('Không thể truy cập microphone. Hãy cấp quyền microphone hoặc nhập văn bản.'));
          return;
        }
      } catch (error) {
        if (!(error instanceof TypeError)) {
          console.error('Could not check microphone permission.', error);
        }
      }

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      audioContext = new AudioContext();
      await audioContext.resume();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const mutedOutput = audioContext.createGain();
      mutedOutput.gain.value = 0;
      const session: RecordingSession = { stream, audioContext, source, processor, mutedOutput, samples: [] };
      processor.onaudioprocess = (event) => {
        if (recordingSession.current === session) {
          session.samples.push(new Float32Array(event.inputBuffer.getChannelData(0)));
        }
      };
      source.connect(processor);
      processor.connect(mutedOutput);
      mutedOutput.connect(audioContext.destination);
      recordingSession.current = session;
      setIsListening(true);
      setNotice(t('Đang ghi âm. Nhấn micro để dừng.'));
      recordingTimer.current = window.setTimeout(stopRecording, MAX_RECORDING_DURATION_MS);
    } catch (error) {
      if (!mounted.current) return;
      stream?.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch((closeError: unknown) => {
          console.error('Could not close microphone audio context after an error.', closeError);
        });
      }
      if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
        setNotice(t('Không thể truy cập microphone. Hãy cấp quyền microphone hoặc nhập văn bản.'));
      } else if (error instanceof DOMException && (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError')) {
        setNotice(t('Không tìm thấy microphone. Hãy kết nối microphone hoặc nhập văn bản.'));
      } else {
        console.error('Could not start microphone recording.', error);
        setNotice(t('Không thể bắt đầu ghi âm. Hãy thử lại.'));
      }
    } finally {
      if (mounted.current) setIsCheckingMicrophone(false);
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
    cancelTranscription();
    cancelImageTranslation();
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
    cancelTranscription();
    cancelImageTranslation();
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
    setImageFile(null);
    setImageTranslation(null);
    sourceImageElement.current = null;
    discardRecording();
  };

  const switchKind = (next: InputKind) => {
    if (next === kind) return;
    resetInput();
    setKind(next);
  };

  const switchDirection = () => {
    cancelTranscription();
    cancelImageTranslation();
    setImageTranslation(null);
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
    if (!('speechSynthesis' in window)) {
      setNotice(t('Trình duyệt chưa hỗ trợ đọc thành tiếng.'));
      return;
    }
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    setNotice('');

    const chunks = splitSpeechText(text);
    let chunkIndex = 0;
    const playNextChunk = () => {
      if (requestId !== speechRequestId.current || chunkIndex >= chunks.length) return;
      try {
        const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
        utterance.lang = 'vi-VN';
        utterance.rate = voiceRate();
        utterance.onend = () => {
          chunkIndex += 1;
          playNextChunk();
        };
        utterance.onerror = () => {
          if (requestId === speechRequestId.current) {
            setNotice(t('Không phát được giọng đọc. Hãy kiểm tra cài đặt âm thanh của thiết bị.'));
          }
        };
        synthesis.speak(utterance);
      } catch (error) {
        console.error('Could not start speech synthesis.', error);
        setNotice(t('Không phát được giọng đọc. Hãy kiểm tra cài đặt âm thanh của thiết bị.'));
      }
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
    if (file.size > 8 * 1024 * 1024) {
      setNotice(t('Ảnh không được vượt quá 8 MB.'));
      return;
    }
    cancelImageTranslation();
    const mimeByExtension = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    } as const;
    const mimeType = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp'
      ? file.type
      : mimeByExtension[ext as keyof typeof mimeByExtension];
    const normalizedFile = file.type === mimeType ? file : new File([file], file.name, { type: mimeType });
    setFileName(file.name);
    setImageReady(false);
    setImageLoadError(false);
    setImageFile(normalizedFile);
    setImageTranslation(null);
    const nextImageUrl = URL.createObjectURL(normalizedFile);
    setImageUrl(nextImageUrl);
    setSourceText('');
    const previewImage = new Image();
    sourceImageElement.current = previewImage;
    previewImage.onload = () => setImageReady(true);
    previewImage.onerror = () => {
      setImageReady(false);
      setImageLoadError(true);
      setNotice(t('Không thể tải ảnh này. Vui lòng thử một tệp khác.'));
    };
    previewImage.src = nextImageUrl;
  };

  const runImageTranslation = async () => {
    if (!imageFile || isImageTranslating) return;
    imageTranslationRequestId.current += 1;
    const requestId = imageTranslationRequestId.current;
    setIsImageTranslating(true);
    setImageTranslation(null);
    setImageTranslationWarning('');
    setNotice('');
    try {
      const result = await translateImage(imageFile, sourceLanguage, reverseDirection);
      if (requestId !== imageTranslationRequestId.current) return;
      setImageTranslation(sampleImageBackgrounds(sourceImageElement.current, result.regions));
      if (result.warning) {
        setImageTranslationWarning(result.warning);
        setNotice(t(result.warning));
      } else if (result.regions.length === 0) {
        setNotice(t('Không tìm thấy chữ có thể đọc trong ảnh.'));
      }
    } catch (error) {
      if (requestId === imageTranslationRequestId.current) {
        setNotice(error instanceof Error ? t(error.message) : t('Không thể dịch chữ trong ảnh lúc này. Vui lòng thử lại.'));
      }
    } finally {
      if (requestId === imageTranslationRequestId.current) setIsImageTranslating(false);
    }
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
          onClick={() => {
            cancelTranscription();
            cancelImageTranslation();
            setImageTranslation(null);
            setSourceLanguage(code);
          }}
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
                  onClick={() => void toggleSpeechRecording()}
                  disabled={isCheckingMicrophone || isTranscribing}
                  aria-busy={isCheckingMicrophone || isTranscribing}
                  aria-label={t(isCheckingMicrophone
                    ? 'Đang kiểm tra quyền microphone...'
                    : isTranscribing
                      ? 'Đang chuyển giọng nói thành văn bản...'
                      : isListening
                        ? 'Dừng ghi âm'
                        : 'Nhấn để nói')}
                  title={t(isCheckingMicrophone
                    ? 'Đang kiểm tra quyền microphone...'
                    : isTranscribing
                      ? 'Đang chuyển giọng nói thành văn bản...'
                      : isListening
                        ? 'Dừng ghi âm'
                        : 'Nhấn để nói')}
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
              <small className="gt-privacy-note">{t('Giọng nói sẽ được gửi đến Gemini để chuyển thành văn bản.')}</small>
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
              <button
                type="button"
                className="gt-image-action gt-image-translate"
                onClick={() => void runImageTranslation()}
                disabled={!imageReady || isImageTranslating}
              >
                <Languages size={16} />
                {t(isImageTranslating ? 'Đang nhận diện và dịch...' : 'Dịch chữ trong ảnh')}
              </button>
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
                    <div className="gt-image-panel-title">
                      {t('Bản dịch phủ lên ảnh')}
                      {imageTranslation && imageTranslation.length > 0 && (
                        <span>{imageTranslation.length} {t('vùng chữ')}</span>
                      )}
                    </div>
                    <div className="gt-image-frame">
                      {isImageTranslating ? (
                        <div className="gt-image-loading" role="status">
                          <span className="gt-spinner" />
                          <span>{t('Đang nhận diện và dịch chữ trong ảnh...')}</span>
                        </div>
                      ) : (
                        <div className="gt-image-artboard">
                          <img
                            src={imageUrl}
                            alt={`${t('Ảnh gốc với bản dịch phủ lên chữ')}: ${fileName}`}
                            onLoad={() => setImageReady(true)}
                            onError={() => {
                              setImageReady(false);
                              setImageLoadError(true);
                              setNotice(t('Không thể tải ảnh này. Vui lòng thử một tệp khác.'));
                            }}
                          />
                          {imageTranslation?.map(({ text, translation, box, backgroundColor, textColor }, index) => (
                            <span
                              key={`${index}-${text}`}
                              className="gt-image-translation-label"
                              style={{
                                top: `${box[0] / 10}%`,
                                left: `${box[1] / 10}%`,
                                width: `${(box[3] - box[1]) / 10}%`,
                                height: `${(box[2] - box[0]) / 10}%`,
                                backgroundColor,
                                color: textColor,
                              }}
                              title={`${text} → ${translation}`}
                            >
                              {translation}
                            </span>
                          ))}
                        </div>
                      )}
                      {!isImageTranslating && !imageTranslation && (
                        <div className={`gt-image-result-status ${notice ? 'gt-image-result-error' : ''}`} role={notice ? 'alert' : 'status'}>
                          {notice || t('Chưa có bản dịch. Nhấn “Dịch chữ trong ảnh” để bắt đầu.')}
                        </div>
                      )}
                      {!isImageTranslating && imageTranslation?.length === 0 && (
                        <div className="gt-image-result-status" role="status">
                          {notice || t('Không có vùng chữ nào được dịch để phủ lên ảnh.')}
                        </div>
                      )}
                      {!isImageTranslating && imageTranslationWarning && imageTranslation && imageTranslation.length > 0 && (
                        <div className="gt-image-result-status gt-image-result-error" role="status">
                          {t(imageTranslationWarning)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {!imageTranslation && !isImageTranslating && (
                  <div className="gt-image-notice" role="status">
                    {t('Ảnh sẽ được gửi tới Gemini để nhận diện và phủ bản dịch lên ảnh khi bạn nhấn nút dịch.')}
                  </div>
                )}
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