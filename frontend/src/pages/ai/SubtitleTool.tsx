import { useEffect, useRef, useState } from 'react';
import { Clapperboard, Upload } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import { findCueIndex, generateMockSubtitles } from './subtitleMock';
import type { SubtitleCue } from './subtitleMock';
import './subtitles.css';

type Status = 'idle' | 'processing' | 'ready' | 'error';

const languagePairs = [
  { id: 'tay', source: 'Tiếng Tày' },
  { id: 'muong', source: 'Tiếng Mường' },
];

const formatTime = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};

export function SubtitleTool() {
  const { t } = useLanguage();
  const fileInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const requestId = useRef(0);
  const [pair, setPair] = useState(languagePairs[0].id);
  const [status, setStatus] = useState<Status>('idle');
  const [videoUrl, setVideoUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  // Theo dõi thời gian video bằng requestAnimationFrame khi đang phát để phụ đề đổi đúng khung hình.
  useEffect(() => {
    const video = videoRef.current;
    if (status !== 'ready' || !video) return;
    let frame = 0;
    const sync = () => setActiveIndex(findCueIndex(cues, video.currentTime));
    const tick = () => {
      sync();
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      tick();
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      sync();
    };
    video.addEventListener('play', start);
    video.addEventListener('pause', stop);
    video.addEventListener('ended', stop);
    video.addEventListener('seeked', sync);
    video.addEventListener('loadeddata', sync);
    if (!video.paused) start();
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener('play', start);
      video.removeEventListener('pause', stop);
      video.removeEventListener('ended', stop);
      video.removeEventListener('seeked', sync);
      video.removeEventListener('loadeddata', sync);
    };
  }, [status, cues]);

  // Giữ câu đang phát ở giữa danh sách, chỉ cuộn trong khung danh sách chứ không cuộn cả trang.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[activeIndex] as HTMLElement | undefined;
    if (!list || !item) return;
    list.scrollTo({ top: item.offsetTop - (list.clientHeight - item.offsetHeight) / 2, behavior: 'smooth' });
  }, [activeIndex]);

  const chooseVideo = async (file?: File) => {
    if (!file) return;
    const id = ++requestId.current;
    setStatus('processing');
    setCues([]);
    setActiveIndex(-1);
    setFileName(file.name);
    setVideoUrl(URL.createObjectURL(file));
    try {
      const result = await generateMockSubtitles(file);
      if (id !== requestId.current) return;
      setCues([...result].sort((a, b) => a.start - b.start));
      setStatus('ready');
    } catch {
      if (id === requestId.current) setStatus('error');
    }
  };

  const seekTo = (index: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = cues[index].start;
    setActiveIndex(index);
    void video.play().catch(() => undefined);
  };

  const active = cues[activeIndex];

  return (
    <section className="sub-layout">
      <div className="sub-main">
        <header className="sub-head">
          <div>
            <strong>{t('Video')}</strong>
            <small>{fileName || t('Chọn video từ thiết bị của em')}</small>
          </div>
          {status !== 'idle' && (
            <button type="button" className="sub-btn sub-btn-ghost" onClick={() => fileInput.current?.click()}>
              <Upload size={16} /> {t('Đổi video')}
            </button>
          )}
        </header>

        <div className="sub-stage">
          {status === 'idle' && (
            <div className="sub-center">
              <span className="sub-badge"><Clapperboard size={28} /></span>
              <button type="button" className="sub-btn sub-btn-primary" onClick={() => fileInput.current?.click()}>
                <Upload size={17} /> {t('Chọn video')}
              </button>
            </div>
          )}

          {status === 'processing' && (
            <div className="sub-center sub-loading" role="status" aria-live="polite">
              <span className="sub-spinner" aria-hidden="true" />
              <strong>{t('AI đang tạo phụ đề...')}</strong>
              <small>{t('Em chờ một chút nhé')}</small>
            </div>
          )}

          {status === 'error' && (
            <div className="sub-center" role="alert">
              <strong>{t('Không đọc được video này')}</strong>
              <button type="button" className="sub-btn sub-btn-primary" onClick={() => fileInput.current?.click()}>
                {t('Chọn video khác')}
              </button>
            </div>
          )}

          {status === 'ready' && (
            <>
              <video ref={videoRef} src={videoUrl} controls controlsList="nofullscreen" playsInline aria-label={t('Video xem trước')} />
              {active && (
                <div className="sub-caption" key={activeIndex} aria-live="polite">
                  <p className="sub-caption-native">{active.native}</p>
                  <p className="sub-caption-vi">{active.vietnamese}</p>
                </div>
              )}
            </>
          )}
        </div>

        <input
          ref={fileInput}
          className="sub-file"
          type="file"
          accept="video/*"
          onChange={(event) => {
            void chooseVideo(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>

      <aside className="sub-side">
        <label className="sub-field">
          <span>{t('Ngôn ngữ')}</span>
          <select value={pair} onChange={(event) => setPair(event.target.value)}>
            {languagePairs.map((item) => (
              <option key={item.id} value={item.id}>{t(item.source)} → {t('Tiếng Việt')}</option>
            ))}
          </select>
        </label>

        <div className="sub-list-wrap">
          <div className="sub-list-head">
            <strong>{t('Lời thoại')}</strong>
            {status === 'ready' && <small>{cues.length} {t('câu')}</small>}
          </div>
          {status === 'ready' && cues.length > 0 ? (
            <ol className="sub-list" ref={listRef}>
              {cues.map((cue, index) => (
                <li key={`${cue.start}-${index}`}>
                  <button type="button" className={index === activeIndex ? 'sub-cue sub-cue-on' : 'sub-cue'} onClick={() => seekTo(index)}>
                    <time>{formatTime(cue.start)}</time>
                    <span>
                      <strong>{cue.native}</strong>
                      <em>{cue.vietnamese}</em>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="sub-empty">{t(status === 'processing' ? 'Đang chờ AI dịch...' : 'Lời thoại sẽ hiện ở đây sau khi chọn video.')}</p>
          )}
        </div>
      </aside>
    </section>
  );
}
