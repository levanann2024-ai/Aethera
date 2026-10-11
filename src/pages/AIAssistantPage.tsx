import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowUp,
  BookOpenCheck,
  Check,
  ChevronRight,
  MessageCircle,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';

const promptCards = [
  {
    icon: MessageCircle,
    prompt: 'Giải thích ngữ cảnh từ Khắc Hoài',
    responseTitle: 'Mình cùng làm rõ ngữ cảnh nhé',
    response: 'Để giải thích chính xác “Khắc Hoài”, mình cần câu đầy đủ và biết cách nói thuộc vùng Tày hay Mường nào. Cùng một cách viết có thể mang sắc thái khác nhau theo địa phương.',
    details: ['Gửi câu có chứa từ này', 'Cho biết người nói ở khu vực nào', 'Đối chiếu lại với người bản ngữ trước khi ghi nghĩa'],
    tone: 'violet',
  },
  {
    icon: Sparkles,
    prompt: 'Dịch câu chào buổi sáng sang tiếng Tày',
    responseTitle: 'Mình sẽ giúp bạn kiểm chứng lời chào',
    response: 'Mình chưa có nguồn phát âm và bản dịch đã được người nói Tày xác nhận để đưa ra một câu chắc chắn. Bạn có thể gửi câu mẫu hoặc cách nói ở địa phương của mình, rồi mình sẽ giúp phân tích và trình bày lại.',
    details: ['Ghi rõ địa phương hoặc phương ngữ', 'Xin xác nhận câu nói từ người bản ngữ', 'Lưu cả câu gốc và ngữ cảnh sử dụng'],
    tone: 'mint',
  },
  {
    icon: BookOpenCheck,
    prompt: 'Phân biệt từ vựng Tày và Mường',
    responseTitle: 'So sánh từ theo từng ngữ cảnh',
    response: 'Tiếng Tày và tiếng Mường thuộc những ngôn ngữ khác nhau, vì vậy không nên suy ra nghĩa chỉ từ cách viết giống nhau. Khi so sánh, hãy đặt các mục từ cạnh nhau theo cách phát âm, nghĩa và câu ví dụ đã được xác nhận tại địa phương.',
    details: ['Tách rõ nhãn Tày và Mường', 'Ghi cách phát âm cùng nghĩa', 'Dùng câu ví dụ của người nói bản ngữ'],
    tone: 'blue',
  },
  {
    icon: WandSparkles,
    prompt: 'Tạo thẻ ghi nhớ cho một từ mới',
    responseTitle: 'Một thẻ từ tốt nên có đủ ngữ cảnh',
    response: 'Mình có thể giúp bạn sắp xếp thông tin thành thẻ ôn tập. Hãy dùng nghĩa và cách đọc đã được xác nhận; đừng tự điền phần còn thiếu bằng phỏng đoán.',
    details: ['Từ hoặc cụm từ gốc', 'Nghĩa tiếng Việt đã xác nhận', 'Câu ví dụ và nguồn xác nhận'],
    tone: 'gold',
  },
] as const;

type Conversation = (typeof promptCards)[number] | {
  prompt: string;
  responseTitle: string;
  response: string;
  details: string[];
  tone: string;
};

export function AIAssistantPage() {
  const { t } = useLanguage();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [question, setQuestion] = useState('');

  const ask = (prompt: string) => {
    const selectedPrompt = promptCards.find((card) => card.prompt === prompt);
    setConversation(selectedPrompt ?? {
      prompt,
      responseTitle: 'Mình có thể cùng bạn tìm hiểu thêm',
      response: 'Hãy cho mình biết từ hoặc câu bạn muốn tìm hiểu, phương ngữ và ngữ cảnh sử dụng. Với nghĩa Tày/Mường, mình sẽ ưu tiên thông tin có thể đối chiếu thay vì tự suy đoán.',
      details: ['Ngôn ngữ hoặc phương ngữ', 'Câu đầy đủ có chứa từ', 'Nguồn xác nhận nếu bạn có'],
      tone: 'violet',
    });
    setQuestion('');
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = question.trim();
    if (prompt) ask(prompt);
  };

  return (
    <div className="ai-assistant-page">
      <section className="ai-assistant-hero">
        <div className="ai-assistant-orbit ai-assistant-orbit-one" />
        <div className="ai-assistant-orbit ai-assistant-orbit-two" />
        <div className="ai-assistant-hero-copy">
          <span className="ai-assistant-kicker"><Sparkles size={17} /> {t('Không gian học tập thông minh')}</span>
          <h1>{t('Trợ lý AI')}<em>{t('Cùng bạn khám phá ngôn ngữ')}</em></h1>
          <p>{t('Đặt câu hỏi, tìm hiểu ngữ cảnh và xây dựng cách học từ vựng phù hợp với bạn.')}</p>
        </div>
        <div className="ai-assistant-hero-mark" aria-hidden="true"><WandSparkles size={43} /></div>
      </section>

      <div className="ai-assistant-layout">
        <section className="ai-assistant-chat">
          <div className="ai-assistant-chat-heading">
            <span className="ai-assistant-avatar"><Sparkles size={21} /></span>
            <div><strong>{t('Trợ lý ngôn ngữ')}</strong><span>{t('Sẵn sàng cùng bạn học mỗi ngày')}</span></div>
            <span className="ai-assistant-online"><i /> {t('Sẵn sàng hỗ trợ')}</span>
          </div>

          <div className="ai-assistant-thread" aria-live="polite">
            {!conversation ? (
              <div className="ai-assistant-welcome">
                <span className="ai-assistant-welcome-icon"><Sparkles size={27} /></span>
                <h2>{t('Bạn muốn khám phá điều gì hôm nay?')}</h2>
                <p>{t('Chọn một gợi ý bên dưới để bắt đầu cuộc trò chuyện.')}</p>
              </div>
            ) : (
              <div className="ai-assistant-exchange">
                <div className="ai-chat-user"><span>{t(conversation.prompt)}</span></div>
                <article className={`ai-chat-answer ai-chat-answer-${conversation.tone}`}>
                  <div className="ai-chat-answer-heading"><span className="ai-assistant-avatar"><Sparkles size={17} /></span><strong>{t(conversation.responseTitle)}</strong></div>
                  <p>{t(conversation.response)}</p>
                  <ul>{conversation.details.map((detail) => <li key={detail}><Check size={17} />{t(detail)}</li>)}</ul>
                  <div className="ai-chat-footnote"><BookOpenCheck size={16} />{t('Thông tin ngôn ngữ nên được xác nhận với người nói bản ngữ.')}</div>
                </article>
              </div>
            )}
          </div>

          <form className="ai-assistant-composer" onSubmit={submitQuestion}>
            <label className="sr-only" htmlFor="ai-assistant-question">{t('Nhập câu hỏi của bạn')}</label>
            <input
              id="ai-assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={t('Hỏi về từ vựng, ngữ cảnh hoặc cách học...')}
              maxLength={240}
            />
            <button type="submit" aria-label={t('Gửi câu hỏi')} disabled={!question.trim()}><ArrowUp size={20} /></button>
          </form>
          <p className="ai-assistant-caution">{t('Gợi ý học tập cần được đối chiếu với nguồn đáng tin cậy và người nói bản ngữ.')}</p>
        </section>

        <aside className="ai-assistant-prompts">
          <div className="ai-assistant-prompts-heading"><span>{t('BẮT ĐẦU NHANH')}</span><h2>{t('Gợi ý cho bạn')}</h2><p>{t('Chọn một chủ đề để trò chuyện cùng trợ lý.')}</p></div>
          {promptCards.map(({ icon: Icon, prompt, tone }) => (
            <button
              className={`ai-assistant-prompt ai-assistant-prompt-${tone}`}
              key={prompt}
              onClick={() => ask(prompt)}
            >
              <span className="ai-assistant-prompt-icon"><Icon size={20} /></span>
              <strong>{t(prompt)}</strong>
              <ChevronRight size={19} />
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
