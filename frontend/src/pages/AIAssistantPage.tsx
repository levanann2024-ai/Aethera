import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import type { ChatAudience, ChatAudienceId } from '@/services/api';
import { aiModes } from './ai/aiModes';
import type { AiModeId } from './ai/aiModes';
import { ChatMode } from './ai/ChatMode';
import { ExplainTool } from './ai/ExplainTool';
import { MatchGame } from './ai/MatchGame';
import { PlanTool } from './ai/PlanTool';
import { SpeakStage } from './ai/SpeakStage';
import { SubtitleTool } from './ai/SubtitleTool';
import './ai/ai.css';
import './ai/aiTools.css';

const AUDIENCE_OPTIONS: Array<{ id: ChatAudienceId; title: string; description: string }> = [
  { id: 'primary', title: 'Học sinh Tiểu học', description: 'Giải thích thật đơn giản, ngắn gọn và gần gũi.' },
  { id: 'middle', title: 'Học sinh THCS', description: 'Cân bằng giữa giải thích rõ ràng và ví dụ thực tế.' },
  { id: 'high', title: 'Học sinh THPT', description: 'Có thể đi sâu hơn vào ngữ pháp và sắc thái từ.' },
  { id: 'community', title: 'Người dân địa phương / người lớn', description: 'Tập trung vào giao tiếp, kinh nghiệm và văn hóa địa phương.' },
  { id: 'educator', title: 'Giáo viên / cán bộ văn hóa / người dạy tiếng', description: 'Thêm gợi ý giải thích, giảng dạy và bảo tồn tiếng dân tộc.' },
];

type AudienceChoice = ChatAudienceId | 'custom';

export function AIAssistantPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AiModeId | null>(null);
  const [audienceStep, setAudienceStep] = useState(false);
  const [audienceChoice, setAudienceChoice] = useState<AudienceChoice | null>(null);
  const [customAudience, setCustomAudience] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<ChatAudience | null>(null);
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
    setSeed(text);
    setAudienceStep(true);
  };

  const startChat = (event: FormEvent) => {
    event.preventDefault();
    if (!audienceChoice) return;
    const audience: ChatAudience = audienceChoice === 'custom'
      ? { type: 'custom', description: customAudience.trim() }
      : { type: 'preset', id: audienceChoice };
    if (audience.type === 'custom' && !audience.description) return;
    setSelectedAudience(audience);
    setAudienceStep(false);
    setMode('chat');
  };

  const active = aiModes.find((item) => item.id === mode);

  if (mode === 'chat' && selectedAudience) {
    return (
      <ChatMode
        initialText={seed}
        initialAudience={selectedAudience}
        onBack={() => {
          setMode(null);
          setAudienceStep(true);
          setSeed('');
        }}
      />
    );
  }

  if (audienceStep) {
    return (
      <div className="aic-audience-page">
        <button type="button" className="aic-back" onClick={() => { setAudienceStep(false); setSeed(''); }}>
          <ArrowLeft size={16} /> {t('Quay lại')}
        </button>
        <form className="aic-audience-form" onSubmit={startChat}>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14503F]/10 text-[#14503F] text-xs font-semibold">
              <Sparkles size={14} /> {t('TRỢ LÝ THÔNG MINH AETHERA')}
            </div>
            <h1>{t('Bạn muốn AI trò chuyện với đối tượng nào?')}</h1>
            <p>{t('Mình sẽ điều chỉnh cách giải thích và độ dài câu trả lời cho phù hợp.')}</p>
          </div>

          <div className="aic-audience-options" role="group" aria-label={t('Chọn đối tượng')}>
            {AUDIENCE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`aic-audience-option${audienceChoice === option.id ? ' aic-audience-option-on' : ''}`}
                aria-pressed={audienceChoice === option.id}
                onClick={() => setAudienceChoice(option.id)}
              >
                <strong>{t(option.title)}</strong>
                <span>{t(option.description)}</span>
              </button>
            ))}
            <button
              type="button"
              className={`aic-audience-option${audienceChoice === 'custom' ? ' aic-audience-option-on' : ''}`}
              aria-pressed={audienceChoice === 'custom'}
              onClick={() => setAudienceChoice('custom')}
            >
              <strong>{t('Đối tượng khác')}</strong>
              <span>{t('Tự mô tả để AI linh hoạt điều chỉnh cách trả lời.')}</span>
            </button>
          </div>

          {audienceChoice === 'custom' && (
            <label className="aic-audience-custom">
              <span>{t('Mô tả đối tượng')}</span>
              <input
                autoFocus
                value={customAudience}
                onChange={(event) => setCustomAudience(event.target.value)}
                placeholder={t('Ví dụ: người mới bắt đầu học tiếng Tày...')}
                maxLength={120}
                required
              />
            </label>
          )}

          <button
            type="submit"
            className="aic-audience-submit"
            disabled={!audienceChoice || (audienceChoice === 'custom' && !customAudience.trim())}
          >
            {t('Bắt đầu trò chuyện')} <ArrowUpRight size={18} />
          </button>
        </form>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="aic-launch max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-2 mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14503F]/10 text-[#14503F] text-xs font-semibold mb-1">
            <Sparkles size={14} />
            <span>{t('TRỢ LÝ THÔNG MINH AETHERA')}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#14503F]">
            {t('Hôm nay bạn muốn học gì?')}
          </h1>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            {t('Chọn một chế độ luyện tập bên dưới hoặc đặt câu hỏi để bắt đầu trò chuyện với AI')}
          </p>
        </div>

        {/* Danh sách 2 Card được căn giữa và phóng to */}
        <div className="aic-cards">
          {aiModes.map(({ id, title, description, tone, icon: Icon }) => (
            <button 
              key={id} 
              type="button" 
              className={`aic-card aic-card-${tone} p-8 flex flex-col items-center text-center`} 
              onClick={() => {
                if (id === 'chat') {
                  setSeed('');
                  setAudienceStep(true);
                  return;
                }
                open(id);
              }}
            >
              <span className="aic-card-icon mb-4">
                <Icon size={52} strokeWidth={1.8} />
              </span>
              <strong className="text-xl mb-2">{t(title)}</strong>
              <span className="text-sm text-gray-600">{t(description)}</span>
            </button>
          ))}
        </div>

        {/* Khung đặt câu hỏi to rộng căn giữa */}
        <form className="aic-ask max-w-3xl mx-auto" onSubmit={submitQuestion}>
          <label htmlFor="aic-question" className="text-base font-semibold text-gray-700 mb-2 block">
            {t('Hoặc bắt đầu bằng câu hỏi của bạn')}
          </label>
          <div className="flex gap-3">
            <input 
              id="aic-question" 
              value={question} 
              onChange={(event) => setQuestion(event.target.value)} 
              placeholder={t('Bạn muốn hỏi AI điều gì?')} 
              maxLength={240} 
            />
            <button type="submit" disabled={!question.trim()}>
              {t('Gửi câu hỏi')} <ArrowUpRight size={18} />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`aix-page${active.id === 'subtitles' ? ' aix-page-wide' : ''}`}>
      <header className="aix-head">
        <button type="button" className="aic-back" onClick={() => setMode(null)}>
          <ArrowLeft size={16} /> {t('Quay lại')}
        </button>
        <div>
          <small>{t('TRỢ LÝ HỌC TẬP')}</small>
          <h1 className="text-[#14503F]">{t(active.title)}</h1>
        </div>
      </header>
      <div className="aix-body">
        {active.id === 'explain' && <ExplainTool initialText={seed} />}
        {active.id === 'plan' && <PlanTool />}
        {active.id === 'quiz' && <MatchGame />}
        {active.id === 'speak' && <SpeakStage />}
        {active.id === 'subtitles' && <SubtitleTool />}
      </div>
    </div>
  );
}