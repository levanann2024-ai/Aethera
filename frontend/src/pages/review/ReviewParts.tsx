import type { ReactNode } from 'react';
import { ArrowLeft, RotateCcw, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/i18n/useLanguage';
import type { DictionaryEntry } from '@/types/dictionary';

export function ReviewShell({ index, total, onExit, children }: { index: number; total: number; onExit: () => void; children: ReactNode }) {
  const { t } = useLanguage();
  const step = Math.min(index + 1, total);
  return (
    <div className="rv-activity">
      <div className="rv-topbar">
        <button type="button" className="rv-exit" onClick={onExit} aria-label={t('Thoát ôn tập')}><X size={20} /></button>
        <div className="rv-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(index, total)}>
          <i style={{ width: `${(Math.min(index, total) / Math.max(total, 1)) * 100}%` }} />
        </div>
        <span className="rv-count">{step}/{total}</span>
      </div>
      {children}
    </div>
  );
}

export function ReviewResult({ total, correct, missed, onRetryMissed, onRetryAll, onModes, onBack }: {
  total: number;
  correct: number;
  missed: DictionaryEntry[];
  onRetryMissed: () => void;
  onRetryAll: () => void;
  onModes: () => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const message = missed.length === 0 ? 'Tuyệt vời! Bạn nhớ hết các từ này rồi.' : correct >= total / 2 ? 'Làm tốt lắm! Ôn thêm vài từ nữa là nhớ hết.' : 'Không sao cả, ôn lại một lần nữa sẽ nhớ hơn.';
  return (
    <div className="rv-result">
      <div className="rv-result-badge"><Sparkles size={34} /></div>
      <h2>{t(message)}</h2>
      <p className="rv-result-score"><strong>{correct}</strong> / {total} {t('từ đã nhớ')}</p>
      <div className="rv-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => <i key={index} className={index < correct ? 'rv-dot-on' : ''} />)}
      </div>
      {missed.length > 0 && (
        <div className="rv-missed">
          <span>{t('Những từ cần ôn thêm')}</span>
          <ul>
            {missed.map((entry) => <li key={entry.id}><strong>{entry.sourceTerm}</strong><span>{entry.meaning}</span></li>)}
          </ul>
        </div>
      )}
      <div className="rv-result-actions">
        {missed.length > 0
          ? <button type="button" className="rv-primary" onClick={onRetryMissed}><RotateCcw size={17} /> {t('Ôn lại từ chưa nhớ')}</button>
          : <button type="button" className="rv-primary" onClick={onRetryAll}><RotateCcw size={17} /> {t('Ôn lại từ đầu')}</button>}
        <button type="button" className="rv-secondary" onClick={onModes}>{t('Chọn cách ôn khác')}</button>
        <button type="button" className="rv-link" onClick={onBack}><ArrowLeft size={16} /> {t('Quay lại Sổ từ vựng')}</button>
      </div>
    </div>
  );
}
