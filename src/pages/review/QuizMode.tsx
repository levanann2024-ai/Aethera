import { useMemo, useState } from 'react';
import { Check, Volume2 } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import type { DictionaryEntry } from '@/types/dictionary';
import { ReviewResult, ReviewShell } from './ReviewParts';
import { buildOptions, speakText, useReviewRound } from './reviewUtils';

type Props = {
  initialDeck: DictionaryEntry[];
  pool: DictionaryEntry[];
  onModes: () => void;
  onBack: () => void;
};

export function QuizMode({ initialDeck, pool, onModes, onBack }: Props) {
  const { t } = useLanguage();
  const round = useReviewRound(initialDeck);
  const [selected, setSelected] = useState<string | null>(null);

  const options = useMemo(
    () => round.deck.map((entry) => buildOptions(entry, pool, 'meaning')),
    [round.deck, pool],
  );

  const choose = (option: string) => {
    if (selected !== null || !round.entry) return;
    setSelected(option);
    round.record(round.entry.id, option === round.entry.meaning);
  };

  const advance = () => {
    setSelected(null);
    round.next();
  };

  const restart = (deck: DictionaryEntry[]) => {
    setSelected(null);
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
  const isCorrect = selected === entry.meaning;
  const last = round.index === round.deck.length - 1;
  return (
    <ReviewShell index={round.index} total={round.deck.length} onExit={onModes}>
      <div className="rv-question">
        <small>{t('Từ này nghĩa là gì?')}</small>
        <h2>
          {entry.sourceTerm}
          <button type="button" className="rv-icon" onClick={() => speakText(entry.sourceTerm)} aria-label={t('Nghe từ này')}><Volume2 size={20} /></button>
        </h2>
      </div>

      <div className="rv-options">
        {options[round.index].map((option, index) => {
          const state = selected === null ? '' : option === entry.meaning ? 'rv-option-right' : option === selected ? 'rv-option-miss' : 'rv-option-dim';
          return (
            <button key={option} type="button" className={`rv-option ${state}`} onClick={() => choose(option)} disabled={selected !== null}>
              <b>{String.fromCharCode(65 + index)}</b>
              <span>{option}</span>
              {state === 'rv-option-right' && <Check size={20} />}
            </button>
          );
        })}
      </div>

      <div className={`rv-feedback ${selected === null ? '' : isCorrect ? 'rv-feedback-right' : 'rv-feedback-miss'}`} aria-live="polite">
        {selected !== null && (
          <>
            <strong>{t(isCorrect ? 'Chính xác!' : 'Gần đúng rồi, bạn nhớ nghĩa này nhé.')}</strong>
            <button type="button" className="rv-primary" onClick={advance}>{t(last ? 'Xem kết quả' : 'Tiếp tục')}</button>
          </>
        )}
      </div>
    </ReviewShell>
  );
}
