import { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw, UserRound, Volume2, X } from 'lucide-react';
import { lookupPhrase, searchDictionary } from '@/services/api';
import { useLanguage } from '@/i18n/useLanguage';
import { speakText } from '@/pages/review/reviewUtils';
import type { DictionaryEntry, SourceLanguage } from '@/types/dictionary';

type Step = { role: string; prompt: string };
type Scenario = { id: string; title: string; hint: string; character: string; steps: Step[] };
type Turn = { text: string; words: string[] };

const scenarios: Scenario[] = [
  {
    id: 'greet',
    title: 'Chào hỏi người lớn',
    hint: 'Gặp bác hàng xóm trên đường',
    character: 'Bác hàng xóm',
    steps: [
      { role: 'Chào', prompt: 'Cháu chào bác! Bác đang đi ra ruộng. Em hãy chào bác nhé.' },
      { role: 'Trả lời', prompt: 'Bác hỏi: “Cháu đi đâu đấy?” Em hãy trả lời là em đang đi học.' },
      { role: 'Tạm biệt', prompt: 'Đến nơi rồi. Em hãy nói lời tạm biệt thật lịch sự.' },
    ],
  },
  {
    id: 'intro',
    title: 'Giới thiệu bản thân',
    hint: 'Làm quen với một bạn mới',
    character: 'Bạn mới',
    steps: [
      { role: 'Tên', prompt: 'Chào bạn! Mình là bạn mới. Bạn tên là gì?' },
      { role: 'Lớp và bản', prompt: 'Bạn học lớp mấy và ở bản nào?' },
      { role: 'Sở thích', prompt: 'Bạn thích điều gì nhất? Hãy kể cho mình nghe.' },
    ],
  },
  {
    id: 'talk',
    title: 'Thuyết trình: Gia đình em',
    hint: 'Nói 3 câu trước cả lớp',
    character: 'Cô giáo',
    steps: [
      { role: 'Mở đầu', prompt: 'Mời em lên bảng. Hãy chào cả lớp và nói chủ đề em sẽ trình bày.' },
      { role: 'Thân bài', prompt: 'Hãy giới thiệu một người trong gia đình em.' },
      { role: 'Kết bài', prompt: 'Em hãy cảm ơn cả lớp đã lắng nghe.' },
    ],
  },
];

export function SpeakStage() {
  const { t } = useLanguage();
  const [lang, setLang] = useState<SourceLanguage>('tay');
  const [bank, setBank] = useState<DictionaryEntry[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [feedback, setFeedback] = useState<Turn | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    searchDictionary(lang).then((entries) => { if (!cancelled) setBank(entries); });
    return () => { cancelled = true; };
  }, [lang]);

  const reset = () => {
    setScenario(null);
    setStep(0);
    setAnswer('');
    setTurns([]);
    setFeedback(null);
  };

  const submit = async () => {
    const text = answer.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const lookup = await lookupPhrase(lang, text);
      const turn: Turn = { text, words: lookup.segments.filter((segment) => segment.matched).map((segment) => segment.source) };
      setTurns((current) => [...current, turn]);
      setFeedback(turn);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    setFeedback(null);
    setAnswer('');
    setStep((current) => current + 1);
  };

  const addWord = (word: string) => setAnswer((current) => (current.trim() ? `${current.trim()} ${word}` : word));

  const changeLang = (value: SourceLanguage) => {
    setLang(value);
    setAnswer('');
  };

  if (!scenario) {
    return (
      <div className="ais-pick">
        <div className="aix-seg" role="group" aria-label={t('Chọn ngôn ngữ')}>
          <button type="button" className={lang === 'tay' ? 'aix-seg-on' : ''} onClick={() => changeLang('tay')}>{t('Tiếng Tày')}</button>
          <button type="button" className={lang === 'muong' ? 'aix-seg-on' : ''} onClick={() => changeLang('muong')}>{t('Tiếng Mường')}</button>
        </div>
        <p className="aix-hint">{t('Chọn một tình huống để bước lên sân khấu.')}</p>
        <div className="ais-scenarios">
          {scenarios.map((item) => (
            <button type="button" key={item.id} onClick={() => setScenario(item)}>
              <span className="ais-avatar"><UserRound size={24} /></span>
              <strong>{t(item.title)}</strong>
              <small>{t(item.hint)}</small>
              <em>{item.steps.length} {t('lượt')}</em>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const finished = step >= scenario.steps.length;
  const current = scenario.steps[Math.min(step, scenario.steps.length - 1)];
  const usedWords = turns.reduce((sum, turn) => sum + turn.words.length, 0);

  return (
    <div className="ais-stage">
      <div className="ais-top">
        <div className="ais-steps" aria-label={t('Tiến độ')}>
          {scenario.steps.map((item, index) => (
            <span key={item.role} className={index < step ? 'ais-step-done' : index === step ? 'ais-step-now' : ''}>{t(item.role)}</span>
          ))}
        </div>
        <button type="button" className="aix-ghost" onClick={reset}><X size={15} /> {t('Đổi tình huống')}</button>
      </div>

      {finished ? (
        <section className="ais-summary">
          <h2>{t('Bài nói của em')}</h2>
          <p className="ais-sub">{t(scenario.title)} · {t('Em đã dùng')} <strong>{usedWords}</strong> {t('từ có trong từ điển')}</p>
          <ol>
            {scenario.steps.map((item, index) => (
              <li key={item.role}>
                <small>{t(item.role)}</small>
                <p>{turns[index]?.text}</p>
              </li>
            ))}
          </ol>
          <div className="aiq-actions">
            <button type="button" className="aix-primary" onClick={() => speakText(turns.map((turn) => turn.text).join('. '), 0.85)}><Volume2 size={17} /> {t('Nghe lại bài nói')}</button>
            <button type="button" className="aix-ghost" onClick={() => { const chosen = scenario; reset(); setScenario(chosen); }}><RotateCcw size={15} /> {t('Luyện lại')}</button>
          </div>
        </section>
      ) : (
        <>
          <div className="ais-scene">
            <span className="ais-avatar ais-avatar-lg"><UserRound size={34} /></span>
            <div className="ais-bubble">
              <small>{t(scenario.character)}</small>
              <p>{t(current.prompt)}</p>
              <button type="button" className="aix-icon" onClick={() => speakText(t(current.prompt))} aria-label={t('Nghe')}><Volume2 size={18} /></button>
            </div>
          </div>

          {feedback ? (
            <div className="ais-feedback">
              <p className="ais-answer">{feedback.text}</p>
              <p>
                {feedback.words.length
                  ? <>{t('Hay lắm! Mình nhận ra')} <strong>{feedback.words.length}</strong> {t('từ em đã học')}: {feedback.words.join(', ')}.</>
                  : t('Cảm ơn em đã thử. Mình chưa nhận ra từ nào trong từ điển, em có thể nhờ người bản ngữ nghe và sửa giúp nhé.')}
              </p>
              <button type="button" className="aix-primary" onClick={next}>{step + 1 >= scenario.steps.length ? t('Xem bài nói của em') : t('Lượt tiếp theo')} <ArrowRight size={17} /></button>
            </div>
          ) : (
            <div className="ais-compose">
              <label htmlFor="ais-answer">{t('Em trả lời bằng tiếng dân tộc. Chạm từ bên dưới hoặc tự gõ.')}</label>
              <textarea id="ais-answer" rows={2} value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={200} />
              <div className="ais-bank" aria-label={t('Kho từ')}>
                {bank.map((entry) => (
                  <button type="button" key={entry.id} onClick={() => addWord(entry.sourceTerm)} title={entry.meaning}>
                    <strong>{entry.sourceTerm}</strong>
                    <span>{entry.meaning}</span>
                  </button>
                ))}
              </div>
              <div className="ais-row">
                <button type="button" className="aix-ghost" onClick={() => setAnswer('')} disabled={!answer}>{t('Xóa')}</button>
                <button type="button" className="aix-primary" onClick={() => void submit()} disabled={!answer.trim() || busy}>{t('Nói xong')} <ArrowRight size={17} /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
