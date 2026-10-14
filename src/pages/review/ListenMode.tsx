import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Volume2 } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import type { DictionaryEntry } from '@/types/dictionary';
import { ReviewResult, ReviewShell } from './ReviewParts';
import { buildOptions, normalizeWord, speakText, useReviewRound } from './reviewUtils';

type Props = {
  initialDeck: DictionaryEntry[];
  pool: DictionaryEntry[];
  onModes: () => void;
  onBack: () => void;
};

export function ListenMode({ initialDeck, pool, onModes, onBack }: Props) {
  const { t } = useLanguage();
  const round = useReviewRound(initialDeck);
  const [answer, setAnswer] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [silent, setSilent] = useState(false);

  const options = useMemo(
    () => round.deck.map((entry) => buildOptions(entry, pool, 'sourceTerm')),
    [round.deck, pool],
  );

  const play = (word: string, rate = 1) => setSilent(!speakText(word, rate));

  const submit = (value: string) => {
    if (answer !== null || !round.entry || !value.trim()) return;
    setAnswer(value);
    round.record(round.entry.id, normalizeWord(value) === normalizeWord(round.entry.sourceTerm));
  };

  const advance = () => {
    setAnswer(null);
    setTyped('');
    round.next();
  };

  const restart = (deck: DictionaryEntry[]) => {
    setAnswer(null);
    setTyped('');
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
  const isCorrect = answer !== null && normalizeWord(answer) === normalizeWord(entry.sourceTerm);
  const last = round.index === round.deck.length - 1;
  return (
    <ReviewShell index={round.index} total={round.deck.length} onExit={onModes}>
      <div className="rv-question">
        <small>{t('Bạn nghe được từ nào?')}</small>
        <div className="rv-listen-buttons">
          <button type="button" className="rv-play" onClick={() => play(entry.sourceTerm)} aria-label={t('Nghe từ này')}><Volume2 size={36} /></button>
          <button type="button" className="rv-sound" onClick={() => play(entry.sourceTerm, 0.55)}>{t('Nghe chậm')}</button>
        </div>
        {silent && <p className="rv-hint">{t('Trình duyệt chưa hỗ trợ đọc thành tiếng.')}</p>}
      </div>

      <div className="rv-options rv-options-grid">
        {options[round.index].map((option, index) => {
          const state = answer === null ? '' : option === entry.sourceTerm ? 'rv-option-right' : option === answer ? 'rv-option-miss' : 'rv-option-dim';
          return (
            <button key={option} type="button" className={`rv-option ${state}`} onClick={() => submit(option)} disabled={answer !== null}>
              <b>{String.fromCharCode(65 + index)}</b>
              <span>{option}</span>
              {state === 'rv-option-right' && <Check size={20} />}
            </button>
          );
        })}
      </div>

      {answer === null && (
        <form className="rv-type" onSubmit={(event: FormEvent) => { event.preventDefault(); submit(typed); }}>
          <input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={t('Hoặc gõ từ bạn nghe được')} maxLength={60} aria-label={t('Hoặc gõ từ bạn nghe được')} />
          <button type="submit" className="rv-secondary" disabled={!typed.trim()}>{t('Kiểm tra')}</button>
        </form>
      )}

      <div className={`rv-feedback ${answer === null ? '' : isCorrect ? 'rv-feedback-right' : 'rv-feedback-miss'}`} aria-live="polite">
        {answer !== null && (
          <>
            <strong>{isCorrect ? t('Chính xác!') : `${t('Từ đúng là')} “${entry.sourceTerm}”`}</strong>
            <span>{entry.meaning}</span>
            <button type="button" className="rv-primary" onClick={advance}>{t(last ? 'Xem kết quả' : 'Tiếp tục')}</button>
          </>
        )}
      </div>
    </ReviewShell>
  );
}
