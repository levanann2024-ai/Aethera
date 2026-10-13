import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Star } from 'lucide-react';
import { searchDictionary } from '@/backend/api';
import { useVocabularyProgress } from '@/backend/vocabulary-progress';
import { useLanguage } from '@/i18n/useLanguage';
import { buildDeck, shuffle, speakText } from '@/pages/review/reviewUtils';
import type { DictionaryEntry, SourceLanguage } from '@/types/dictionary';

const PAIRS = 5;

export function MatchGame() {
  const { t } = useLanguage();
  const { pinned, learned } = useVocabularyProgress();
  const [lang, setLang] = useState<SourceLanguage>('tay');
  const [deck, setDeck] = useState<DictionaryEntry[]>([]);
  const [meanings, setMeanings] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState<string | null>(null);
  const [meaning, setMeaning] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ term: string; meaning: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const timer = useRef<number>();
  const progressRef = useRef({ pinned, learned });
  progressRef.current = { pinned, learned };

  const start = useCallback(async (language: SourceLanguage) => {
    window.clearTimeout(timer.current);
    setLoading(true);
    const entries = await searchDictionary(language);
    const next = buildDeck(entries, progressRef.current.pinned, progressRef.current.learned, PAIRS).deck;
    setDeck(next);
    setMeanings(shuffle(next));
    setTerm(null);
    setMeaning(null);
    setMatched([]);
    setWrong(null);
    setMistakes(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void start(lang);
    return () => window.clearTimeout(timer.current);
  }, [lang, start]);

  const settle = (nextTerm: string | null, nextMeaning: string | null) => {
    if (!nextTerm || !nextMeaning) return;
    if (nextTerm === nextMeaning) {
      setMatched((current) => [...current, nextTerm]);
      const entry = deck.find((item) => item.id === nextTerm);
      if (entry) speakText(entry.sourceTerm);
      setTerm(null);
      setMeaning(null);
      return;
    }
    setMistakes((current) => current + 1);
    setWrong({ term: nextTerm, meaning: nextMeaning });
    timer.current = window.setTimeout(() => {
      setWrong(null);
      setTerm(null);
      setMeaning(null);
    }, 700);
  };

  const pickTerm = (id: string) => {
    if (wrong || matched.includes(id)) return;
    setTerm(id);
    settle(id, meaning);
  };

  const pickMeaning = (id: string) => {
    if (wrong || matched.includes(id)) return;
    setMeaning(id);
    settle(term, id);
  };

  const finished = deck.length > 1 && matched.length === deck.length;
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  return (
    <div className="aiq-game">
      <div className="aiq-top">
        <div className="aix-seg" role="group" aria-label={t('Chọn ngôn ngữ')}>
          <button type="button" className={lang === 'tay' ? 'aix-seg-on' : ''} onClick={() => setLang('tay')}>{t('Tiếng Tày')}</button>
          <button type="button" className={lang === 'muong' ? 'aix-seg-on' : ''} onClick={() => setLang('muong')}>{t('Tiếng Mường')}</button>
        </div>
        <span className="aiq-count">{matched.length}/{deck.length} {t('cặp')}</span>
      </div>

      {loading ? (
        <p className="aix-empty">{t('Đang chuẩn bị trò chơi...')}</p>
      ) : deck.length < 2 ? (
        <p className="aix-empty">{t('Sổ từ vựng chưa đủ từ để chơi (cần ít nhất 2 từ).')}</p>
      ) : finished ? (
        <section className="aiq-done">
          <div className="aiq-stars" aria-label={`${stars}/3`}>
            {[1, 2, 3].map((value) => <Star key={value} size={42} className={value <= stars ? 'aiq-star-on' : ''} />)}
          </div>
          <h2>{mistakes === 0 ? t('Tuyệt vời! Em nối đúng hết mà không sai lần nào.') : t('Hoàn thành rồi!')}</h2>
          <p>{t('Số lần nối nhầm')}: {mistakes}</p>
          <div className="aiq-actions">
            <button type="button" className="aix-primary" onClick={() => void start(lang)}><RotateCcw size={17} /> {t('Chơi lại')}</button>
          </div>
        </section>
      ) : (
        <>
          <p className="aix-hint">{t('Chạm một từ, rồi chạm nghĩa của từ đó để nối cặp.')}</p>
          <div className="aiq-board">
            <div className="aiq-col">
              {deck.map((entry) => {
                const state = matched.includes(entry.id) ? 'aiq-matched' : wrong?.term === entry.id ? 'aiq-wrong' : term === entry.id ? 'aiq-picked' : '';
                return (
                  <button type="button" key={entry.id} className={`aiq-tile aiq-term ${state}`} onClick={() => pickTerm(entry.id)} disabled={matched.includes(entry.id)}>
                    {entry.sourceTerm}
                  </button>
                );
              })}
            </div>
            <div className="aiq-col">
              {meanings.map((entry) => {
                const state = matched.includes(entry.id) ? 'aiq-matched' : wrong?.meaning === entry.id ? 'aiq-wrong' : meaning === entry.id ? 'aiq-picked' : '';
                return (
                  <button type="button" key={entry.id} className={`aiq-tile aiq-meaning ${state}`} onClick={() => pickMeaning(entry.id)} disabled={matched.includes(entry.id)}>
                    {entry.meaning}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
