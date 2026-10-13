import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import { aiModes } from './ai/aiModes';
import type { AiModeId } from './ai/aiModes';
import { ChatMode } from './ai/ChatMode';
import { ExplainTool } from './ai/ExplainTool';
import { MatchGame } from './ai/MatchGame';
import { PlanTool } from './ai/PlanTool';
import { SpeakStage } from './ai/SpeakStage';
import './ai/ai.css';
import './ai/aiTools.css';

export function AIAssistantPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AiModeId | null>(null);
  const [question, setQuestion] = useState('');
  const [seed, setSeed] = useState('');

  const open = (next: AiModeId, text = '') => {
    setSeed(text);
    setMode(next);
  };

  const submitQuestion = (event: FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    setQuestion('');
    open('chat', text);
  };

  const active = aiModes.find((item) => item.id === mode);

  if (mode === 'chat') return <ChatMode initialText={seed} onBack={() => setMode(null)} />;

  if (!active) {
    return (
      <div className="aic-launch">
        <header>
          <span className="aic-kicker">{t('HỌC THEO CÁCH CỦA BẠN')}</span>
          <h1>{t('Hôm nay bạn muốn học điều gì?')}</h1>
          <p>{t('Chọn một cách bắt đầu để học dễ hiểu hơn và tự tin hơn mỗi ngày.')}</p>
        </header>

        <div className="aic-cards">
          {aiModes.map(({ id, title, description, tone, icon: Icon }) => (
            <button key={id} type="button" className={`aic-card aic-card-${tone}`} onClick={() => open(id)}>
              <span className="aic-card-icon"><Icon size={28} strokeWidth={1.7} /></span>
              <strong>{t(title)}</strong>
              <span>{t(description)}</span>
            </button>
          ))}
        </div>

        <form className="aic-ask" onSubmit={submitQuestion}>
          <label htmlFor="aic-question">{t('Hoặc bắt đầu bằng câu hỏi của bạn')}</label>
          <div>
            <input id="aic-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t('Bạn muốn hỏi AI điều gì?')} maxLength={240} />
            <button type="submit" disabled={!question.trim()}>{t('Gửi câu hỏi')} <ArrowUpRight size={16} /></button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="aix-page">
      <header className="aix-head">
        <button type="button" className="aic-back" onClick={() => setMode(null)}><ArrowLeft size={16} /> {t('Quay lại')}</button>
        <div>
          <small>{t('TRỢ LÝ HỌC TẬP')}</small>
          <h1>{t(active.title)}</h1>
        </div>
      </header>
      <div className="aix-body">
        {active.id === 'explain' && <ExplainTool initialText={seed} />}
        {active.id === 'plan' && <PlanTool />}
        {active.id === 'quiz' && <MatchGame />}
        {active.id === 'speak' && <SpeakStage />}
      </div>
      <p className="aic-note">{t('Trợ lý hiện dựa trên từ điển mẫu của ứng dụng, chưa phải AI thật. Hãy đối chiếu với người nói bản ngữ.')}</p>
    </div>
  );
}
