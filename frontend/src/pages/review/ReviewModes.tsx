import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import type { ReviewMode } from './reviewUtils';

function FlashcardArt() {
  return (
    <svg viewBox="0 0 200 130" aria-hidden="true">
      <rect x="86" y="22" width="84" height="88" rx="12" transform="rotate(10 128 66)" fill="#147965" />
      <rect x="96" y="30" width="64" height="72" rx="8" transform="rotate(10 128 66)" fill="none" stroke="#f3c644" strokeWidth="2" opacity=".7" />
      <rect x="30" y="28" width="96" height="82" rx="12" fill="#fffdf5" stroke="#e7dfc4" strokeWidth="2" />
      <text x="78" y="64" textAnchor="middle" fontSize="22" fontWeight="800" fill="#14503f" fontFamily="Plus Jakarta Sans, sans-serif">Slao</text>
      <rect x="52" y="76" width="52" height="6" rx="3" fill="#e6dcb5" />
      <rect x="62" y="88" width="32" height="6" rx="3" fill="#efe7c9" />
    </svg>
  );
}

function QuizArt() {
  const rows = [['A', 'Nghĩa A'], ['B', 'Nghĩa B'], ['C', 'Nghĩa C'], ['D', 'Nghĩa D']];
  return (
    <svg viewBox="0 0 200 130" aria-hidden="true">
      <rect x="22" y="6" width="156" height="22" rx="8" fill="#fffdf5" />
      <text x="100" y="21" textAnchor="middle" fontSize="11" fontWeight="700" fill="#14503f" fontFamily="Plus Jakarta Sans, sans-serif">Từ này nghĩa là gì?</text>
      {rows.map(([letter, label], index) => (
        <g key={letter} transform={`translate(22 ${34 + index * 24})`}>
          <rect width="156" height="20" rx="10" fill={index === 0 ? '#e6f4ec' : '#fff'} stroke={index === 0 ? '#2f8f76' : '#e3ebe6'} strokeWidth="1.5" />
          <circle cx="11" cy="10" r="7" fill={index === 0 ? '#147965' : '#cfe3da'} />
          <text x="11" y="13.4" textAnchor="middle" fontSize="9" fontWeight="800" fill={index === 0 ? '#fff' : '#14503f'}>{letter}</text>
          <text x="26" y="13.4" fontSize="10" fontWeight="600" fill="#3d5f56">{label}</text>
        </g>
      ))}
    </svg>
  );
}

function ListenArt() {
  return (
    <svg viewBox="0 0 200 130" aria-hidden="true">
      <path d="M44 84V68a56 56 0 0 1 112 0v16" fill="none" stroke="#14503f" strokeWidth="9" strokeLinecap="round" />
      <rect x="32" y="70" width="26" height="44" rx="12" fill="#147965" />
      <rect x="142" y="70" width="26" height="44" rx="12" fill="#147965" />
      <g stroke="#f3c644" strokeWidth="5" strokeLinecap="round">
        <path d="M80 80v14M90 66v42M100 56v62M110 66v42M120 80v14" />
      </g>
    </svg>
  );
}

const modes: { id: ReviewMode; title: string; subtitle: string; description: string; Art: () => JSX.Element }[] = [
  { id: 'flashcard', title: 'Flashcard', subtitle: 'Lật thẻ nhớ', description: 'Xem từ tiếng địa phương, lật thẻ để kiểm tra nghĩa. Phù hợp để học nhanh từ mới.', Art: FlashcardArt },
  { id: 'quiz', title: 'Trắc nghiệm 4 đáp án', subtitle: 'Quiz', description: 'Chọn nghĩa Tiếng phổ thông đúng cho từ hiển thị. Giúp kiểm tra độ thuộc bài cấp tốc.', Art: QuizArt },
  { id: 'listen', title: 'Luyện nghe bản địa', subtitle: 'Audio Practice', description: 'Nghe giọng đọc phát âm địa phương và chọn hoặc gõ đúng từ. Giúp rèn kỹ năng nghe.', Art: ListenArt },
];

export function ReviewModes({ wordCount, usePinned, onPick, onBack }: { wordCount: number; usePinned: boolean; onPick: (mode: ReviewMode) => void; onBack: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="rv-modes">
      <header className="rv-head">
        <h1>{t('Bạn muốn ôn tập theo cách nào?')}</h1>
        <p>{t('Chọn một hình thức để bắt đầu luyện các từ đã lưu.')}</p>
        {wordCount > 0 && <span className="rv-deck-note">{t(usePinned ? 'Ôn các từ bạn đã ghim' : 'Chưa ghim từ nào, ôn các từ trong sổ')} · {wordCount} {t('từ')}</span>}
      </header>

      {wordCount === 0 ? (
        <div className="rv-empty">{t('Sổ từ vựng chưa có từ nào để ôn.')}</div>
      ) : (
        <div className="rv-mode-grid">
          {modes.map(({ id, title, subtitle, description, Art }) => (
            <article key={id} className="rv-mode-card">
              <div className="rv-mode-art"><Art /></div>
              <h2>{t(title)}</h2>
              <strong>{t(subtitle)}</strong>
              <p>{t(description)}</p>
              <button type="button" className="rv-primary" onClick={() => onPick(id)}>{t('Bắt đầu')}</button>
            </article>
          ))}
        </div>
      )}

      <button type="button" className="rv-link" onClick={onBack}><ArrowLeft size={16} /> {t('Quay lại Sổ từ vựng')}</button>
    </div>
  );
}
