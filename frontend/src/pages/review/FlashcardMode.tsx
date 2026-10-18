import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import type { DictionaryEntry } from '@/types/dictionary';
import { ReviewResult, ReviewShell } from './ReviewParts';
import { speakText, useReviewRound } from './reviewUtils';

type Props = {
  initialDeck: DictionaryEntry[];
  onSetLearned: (id: string, learned: boolean) => void;
  onModes: () => void;
  onBack: () => void;
};

export function FlashcardMode({ initialDeck, onSetLearned, onModes, onBack }: Props) {
  const { t } = useLanguage();
  const round = useReviewRound(initialDeck);
  const [flipped, setFlipped] = useState(false);

  const answer = (remembered: boolean) => {
    if (!round.entry) return;
    round.record(round.entry.id, remembered);
    if (remembered) onSetLearned(round.entry.id, true);
    setFlipped(false);
    round.next();
  };

  const restart = (deck: DictionaryEntry[]) => {
    setFlipped(false);
    round.restart(deck);
  };

  if (round.finished) {
    return (
      <ReviewResult
        total={round.deck.length}
        correct={round.correct}
        missed={round.missed}
        onRetryMissed={() => restart(round.missed)}
        onRetryAll={() => restart(round.deck)}
        onModes={onModes}
        onBack={onBack}
      />
    );
  }

  const entry = round.entry!;
  return (
    <ReviewShell index={round.index} total={round.deck.length} onExit={onModes}>
      <button
        type="button"
        className={`rv-flip ${flipped ? 'rv-flip-on' : ''}`}
        onClick={() => setFlipped((current) => !current)}
        aria-label={t(flipped ? 'Lật về mặt từ' : 'Lật xem nghĩa')}
      >
        <span className="rv-face rv-face-front">
          <small>{t('Từ tiếng địa phương')}</small>
          <strong>{entry.sourceTerm}</strong>
          <em>{t('Chạm vào thẻ để xem nghĩa')}</em>
        </span>
        <span className="rv-face rv-face-back">
          <small>{t('Tiếng phổ thông')}</small>
          <strong>{entry.meaning}</strong>
          {entry.example && <em>{entry.example}</em>}
        </span>
      </button>

      <button type="button" className="rv-sound" onClick={() => speakText(entry.sourceTerm)}>
        <Volume2 size={18} /> {t('Nghe từ này')}
      </button>

      <div className={`rv-choices ${flipped ? 'rv-choices-on' : ''}`}>
        <button type="button" className="rv-secondary" onClick={() => answer(false)} tabIndex={flipped ? 0 : -1}>{t('Chưa nhớ')}</button>
        <button type="button" className="rv-primary" onClick={() => answer(true)} tabIndex={flipped ? 0 : -1}>{t('Đã nhớ')}</button>
      </div>
    </ReviewShell>
  );
}
