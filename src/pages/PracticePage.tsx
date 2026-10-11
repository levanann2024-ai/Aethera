import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, RotateCcw, Sparkles } from 'lucide-react';
import { searchDictionary } from '@/backend/api';
import { DataPageShell } from '@/components/AppLayout';
import { mockPracticeQuestions } from '@/data/mockData';
import { useLanguage } from '@/i18n/useLanguage';
import type { Route } from '@/types/navigation';
import type { DictionaryEntry, SourceLanguage } from '@/types/dictionary';

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

export function PracticePage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { t } = useLanguage();
  const [language, setLanguage] = useState<SourceLanguage>('tay');
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [usingSample, setUsingSample] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setEntries([]);
    setUsingSample(false);
    searchDictionary(language)
      .then((result) => {
        if (!active) return;
        const distinctMeanings = new Set(result.map((entry) => entry.meaning.trim()).filter(Boolean));
        if (distinctMeanings.size < 2) {
          setUsingSample(true);
        } else {
          setEntries(result);
        }
        setQuestionIndex(0);
        setSelected('');
        setSubmitted(false);
        setFinished(false);
        setScore(0);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setUsingSample(true);
          setQuestionIndex(0);
          setSelected('');
          setSubmitted(false);
          setFinished(false);
          setScore(0);
          setError(requestError instanceof Error ? requestError.message : 'Không thể tải từ điển.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [language, refreshKey]);

  const questions = useMemo<QuizQuestion[]>(() => {
    if (usingSample) return mockPracticeQuestions;

    const uniqueEntries = Array.from(new Map(entries.map((entry) => [entry.meaning, entry])).values());
    return uniqueEntries.map((entry, index) => {
      const alternatives = uniqueEntries.filter((candidate) => candidate.meaning !== entry.meaning);
      const options = [
        entry.meaning,
        ...Array.from({ length: Math.min(3, alternatives.length) }, (_, offset) => (
          alternatives[(index + offset) % alternatives.length].meaning
        )),
      ].sort((first, second) => first.localeCompare(second, 'vi'));
      return {
        id: entry.id,
        prompt: entry.sourceTerm,
        options,
        answer: entry.meaning,
        explanation: entry.example,
      };
    });
  }, [entries, usingSample]);

  const question = questions[questionIndex];

  const submit = () => {
    if (!selected || !question) return;
    setSubmitted(true);
    if (selected === question.answer) setScore((current) => current + 1);
  };

  const next = () => {
    if (questionIndex === questions.length - 1) setFinished(true);
    else {
      setQuestionIndex((current) => current + 1);
      setSelected('');
      setSubmitted(false);
    }
  };

  const restart = () => {
    setQuestionIndex(0);
    setSelected('');
    setSubmitted(false);
    setFinished(false);
    setScore(0);
  };

  return (
    <DataPageShell
      eyebrow="Luyện tập cùng từ điển"
      title="Luyện tập"
      description="Ôn từ và nghĩa bằng những câu hỏi ngắn. Khi từ điển chưa sẵn sàng, bạn vẫn có thể thử luồng luyện tập với dữ liệu minh họa."
    >
      <div className="practice-language">
        <label htmlFor="practice-language">{t('Phương ngữ')}</label>
        <select id="practice-language" value={language} onChange={(event) => setLanguage(event.target.value as SourceLanguage)}>
          <option value="tay">{t('Tày')}</option>
          <option value="muong">{t('Mường')}</option>
        </select>
      </div>
      {error && <div className="notice" role="alert">{t(error)} <button className="quiet-button" onClick={() => setRefreshKey((current) => current + 1)}>{t('Thử lại')}</button></div>}
      {usingSample && !loading && (
        <div className="sample-data-note" role="status">
          <Sparkles size={17} />
          <span>{t('Đang dùng dữ liệu luyện tập minh họa; đây không phải nội dung Tày/Mường đã được kiểm chứng.')}</span>
        </div>
      )}
      {loading && <div className="data-empty"><p>{t('Đang tải từ điển...')}</p></div>}
      {!loading && questions.length >= 2 && finished && (
        <div className="practice-result">
          <div className="result-icon"><Check size={22} /></div>
          <div className="eyebrow">{t('Hoàn thành lượt luyện')}</div>
          <h2>{t('Kết quả')}</h2>
          <p>{score}/{questions.length} {t('câu đúng.')}</p>
          <div className="empty-actions">
            <button className="secondary-button" onClick={restart}><RotateCcw size={17} /> {t('Làm lại')}</button>
            <button className="primary-button" onClick={() => onNavigate('vocabulary')}><BookOpen size={17} /> {t('Mở từ điển')}</button>
          </div>
        </div>
      )}
      {!loading && question && !finished && (
        <div className="practice-card">
          <div className="practice-progress">
            <span>{t('Câu')} {questionIndex + 1} / {questions.length}</span>
            <div><i style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
          </div>
          <div className="question-head">
            <div><span>{usingSample ? t('Chọn đáp án đúng') : t('Chọn nghĩa tiếng Việt đúng')} </span><h2>{usingSample ? question.prompt : `“${question.prompt}”`}</h2></div>
          </div>
          <div className="answer-grid">
            {question.options.map((option, index) => (
              <button
                key={`${question.id}-${option}`}
                className={`answer-option ${submitted && option === question.answer ? 'answer-correct' : ''} ${submitted && selected === option && option !== question.answer ? 'answer-wrong' : ''} ${selected === option ? 'answer-selected' : ''}`}
                onClick={() => !submitted && setSelected(option)}
                disabled={submitted}
                aria-pressed={selected === option}
              >
                <b>{String.fromCharCode(65 + index)}.</b>{option}
                {submitted && option === question.answer && <Check size={18} />}
              </button>
            ))}
          </div>
          {submitted && (
            <div className={`answer-feedback ${selected === question.answer ? 'feedback-correct' : 'feedback-wrong'}`}>
              <strong>{selected === question.answer ? t('Chính xác.') : t('Hãy xem lại nghĩa đúng bên trên.')}</strong>
              {question.explanation && <span>{t('Giải thích')}: {question.explanation}</span>}
            </div>
          )}
          <div className="practice-actions">
            <span>{score} {t('câu đúng.')}</span>
            {submitted
              ? <button className="primary-button" onClick={next}>{questionIndex === questions.length - 1 ? t('Xem kết quả') : t('Câu tiếp theo')} <ArrowRight size={17} /></button>
              : <button className="primary-button" onClick={submit} disabled={!selected}>{t('Kiểm tra')} <Check size={17} /></button>}
          </div>
        </div>
      )}
    </DataPageShell>
  );
}
