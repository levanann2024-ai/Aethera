import { getSettings } from '@/backend/settings';
import { useEffect, useMemo, useState } from 'react';
import { searchDictionary } from '@/backend/api';
import { useVocabularyProgress } from '@/backend/vocabulary-progress';
import { useLanguage } from '@/i18n/useLanguage';
import type { Route } from '@/types/navigation';
import type { DictionaryEntry } from '@/types/dictionary';
import { FlashcardMode } from './review/FlashcardMode';
import { ListenMode } from './review/ListenMode';
import { QuizMode } from './review/QuizMode';
import { ReviewModes } from './review/ReviewModes';
import { buildDeck } from './review/reviewUtils';
import type { ReviewMode } from './review/reviewUtils';
import './vocabulary.css';

type View = 'modes' | ReviewMode;

export function PracticePage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { t } = useLanguage();
  const { pinned, learned, setLearned } = useVocabularyProgress();
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [deck, setDeck] = useState<DictionaryEntry[]>([]);
  const [view, setView] = useState<View>('modes');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    searchDictionary(getSettings().defaultLanguage)
      .then((result) => {
        if (active) setEntries(result);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Không thể tải từ điển.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refreshKey]);

  const availableDeck = useMemo(
    () => buildDeck(entries, pinned, learned),
    [entries, pinned, learned],
  );

  const startMode = (mode: ReviewMode) => {
    setDeck(availableDeck.deck);
    setView(mode);
  };

  const backToModes = () => setView('modes');
  const backToVocabulary = () => onNavigate('vocabulary');

  return (
    <div className="vb-page">
      {loading && <div className="vb-empty"><p>{t('Đang tải từ điển...')}</p></div>}
      {error && (
        <div className="notice" role="alert">
          {t(error)} <button className="quiet-button" onClick={() => setRefreshKey((current) => current + 1)}>{t('Thử lại')}</button>
        </div>
      )}
      {!loading && !error && view === 'modes' && (
        <ReviewModes
          wordCount={availableDeck.deck.length}
          usePinned={availableDeck.usePinned}
          onPick={startMode}
          onBack={backToVocabulary}
        />
      )}
      {!loading && !error && view === 'flashcard' && (
        <FlashcardMode initialDeck={deck} onSetLearned={setLearned} onModes={backToModes} onBack={backToVocabulary} />
      )}
      {!loading && !error && view === 'quiz' && (
        <QuizMode initialDeck={deck} pool={entries} onModes={backToModes} onBack={backToVocabulary} />
      )}
      {!loading && !error && view === 'listen' && (
        <ListenMode initialDeck={deck} pool={entries} onModes={backToModes} onBack={backToVocabulary} />
      )}
    </div>
  );
}
