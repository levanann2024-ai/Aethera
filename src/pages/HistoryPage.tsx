import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, Copy, Languages, Search, Sparkles, Trash2, Volume2 } from 'lucide-react';
import { clearStudyHistory, getStudyHistory } from '@/backend/study-history';
import type { StudyRecord } from '@/backend/study-history';
import { DataPageShell } from '@/components/AppLayout';
import { mockHistory } from '@/data/mockData';
import { useLanguage } from '@/i18n/useLanguage';
import type { User } from '@/types/auth';
import type { Route } from '@/types/navigation';

export function HistoryPage({ onNavigate, user }: { onNavigate: (route: Route) => void; user: User | null }) {
  const { language, t } = useLanguage();
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<StudyRecord | null>(null);
  const [error, setError] = useState('');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'tay' | 'muong'>('all');

  useEffect(() => {
    setError('');
    setSelected(null);
    setRecords([]);
    try {
      setRecords(getStudyHistory(user?.id));
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Không thể đọc lịch sử học tập.');
    }
  }, [user?.id]);

  const filtered = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase();
    if (!searchTerm) return records;
    return records.filter((record) => (
      (languageFilter === 'all' || record.language === languageFilter)
      &&
      `${record.source} ${record.segments.map((segment) => `${segment.source} ${segment.meaning}`).join(' ')}`
        .toLocaleLowerCase()
        .includes(searchTerm)
    ));
  }, [languageFilter, query, records]);

  const sampleFiltered = mockHistory.filter((item) => {
    const matchesDialect = languageFilter === 'all' || item.language.toLocaleLowerCase() === languageFilter;
    const matchesSearch = `${item.source} ${item.meaning} ${item.language}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    return matchesDialect && matchesSearch;
  });

  const clearHistory = () => {
    try {
      clearStudyHistory(user?.id);
      setRecords([]);
      setSelected(null);
      setError('');
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Không thể xóa lịch sử học tập.');
    }
  };

  return (
    <DataPageShell
      eyebrow="Nhật ký hành trình"
      title="Lịch sử tra từ"
      description="Mỗi lần tra cứu là một dấu mốc nhỏ. Tìm lại cụm từ, xem mức độ khớp và tiếp tục hành trình học."
    >
      <section className="history-overview">
        <div className="history-overview-copy">
          <span className="history-overview-kicker"><Sparkles size={15} /> {t('Hành trình của bạn')}</span>
          <strong>{records.length.toString().padStart(2, '0')} <small>{t('lượt tra đã lưu')}</small></strong>
          <span>{records.length ? t('Cứ tiếp tục nhé, mỗi lần tra lại thêm một điều đáng nhớ.') : t('Bắt đầu bằng một cụm từ bạn muốn tìm hiểu.')}</span>
        </div>
        <div className="history-overview-decoration" aria-hidden="true"><BookOpen size={34} /><span /><span /></div>
      </section>

      <div className="history-toolbar">
        <label className="search-field history-search">
          <Search size={18} />
          <span className="sr-only">{t('Tìm trong lịch sử')}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Tìm cụm từ hoặc nghĩa...')} />
        </label>
        <div className="history-filters" aria-label={t('Lọc theo phương ngữ')}>
          {(['all', 'tay', 'muong'] as const).map((filter) => (
            <button key={filter} className={languageFilter === filter ? 'history-filter-active' : ''} onClick={() => setLanguageFilter(filter)}>
              {t(filter === 'all' ? 'Tất cả' : filter === 'tay' ? 'Tày' : 'Mường')}
            </button>
          ))}
        </div>
        {!!records.length && (
          <button className="quiet-button danger-button history-clear" onClick={clearHistory}>
            <Trash2 size={17} /> {t('Xóa lịch sử')}
          </button>
        )}
      </div>
      {error && <div className="notice" role="alert">{t(error)}</div>}
      {!records.length && (
        <>
          <div className="history-empty">
            <div className="history-empty-icon"><Languages size={23} /></div>
            <div className="history-empty-copy">
              <span className="eyebrow">{t('Mở đầu hành trình')}</span>
              <h2>{t('Lịch sử của bạn đang chờ dấu chân đầu tiên')}</h2>
              <p>{t('Tra một từ hoặc cụm từ trong từ điển đã kiểm chứng. Kết quả thật sẽ tự lưu tại đây để bạn xem lại.')}</p>
              <button className="primary-button" onClick={() => onNavigate('translate')}><Languages size={17} /> {t('Bắt đầu tra từ')}</button>
            </div>
          </div>
          {!error && (
            <section className="history-preview">
              <div className="history-preview-heading">
                <div><span className="eyebrow">{t('Làm quen giao diện')}</span><h2>{t('Một vài ví dụ minh họa')}</h2></div>
                <span className="history-sample-badge"><span /> {t('Chỉ là dữ liệu mẫu')}</span>
              </div>
              <div className="history-sample-grid">
                {sampleFiltered.map((item, index) => (
                  <article className="history-sample-card" key={item.id}>
                    <div className="history-sample-top"><span className={`history-language-pill ${item.language === 'Tày' ? 'history-pill-tay' : 'history-pill-muong'}`}><Languages size={13} /> {t(item.language)}</span><span className="history-sample-index">0{index + 1}</span></div>
                    <strong>{t(item.source)}</strong>
                    <p>{t(item.meaning)}</p>
                    <div className="history-sample-footer"><span><Check size={14} /> {item.matchedWords} {t('từ gợi ý')}</span><span>{t(item.time)}</span></div>
                  </article>
                ))}
              </div>
              {!sampleFiltered.length && <p className="history-no-matches">{t('Không tìm thấy ví dụ phù hợp.')}</p>}
              <p className="history-preview-note"><Sparkles size={15} /> {t('Các thẻ này chỉ minh họa giao diện, không phải kết quả tra từ thật.')}</p>
            </section>
          )}
        </>
      )}
      {!!filtered.length && (
        <div className="history-list">
          {filtered.map((record) => (
            <article className="history-record-card" key={record.id}>
              <div className="history-record-rail"><span className="history-record-dot" /><span /></div>
              <button className="history-record-main" onClick={() => setSelected(record)}>
                <div className="history-record-topline">
                  <span className={`history-language-pill ${record.language === 'tay' ? 'history-pill-tay' : 'history-pill-muong'}`}><Languages size={13} /> {t(record.language === 'tay' ? 'Tày' : 'Mường')}</span>
                  <time>{new Date(record.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</time>
                </div>
                <strong className="history-record-source">{record.source}</strong>
                <div className="history-record-bottom">
                  <span>{record.segments.filter((segment) => segment.matched).length} {t('cụm từ khớp')}</span>
                  <span className="history-coverage"><i style={{ width: `${record.coverage}%` }} />{record.coverage}%</span>
                  <span className="history-record-open">{t('Xem chi tiết')} <ArrowRight size={15} /></span>
                </div>
              </button>
            </article>
          ))}
        </div>
      )}
      {!!records.length && !filtered.length && <div className="history-no-results"><Search size={20} /><strong>{t('Không tìm thấy lượt tra phù hợp')}</strong><span>{t('Hãy đổi từ khóa hoặc chọn phương ngữ khác.')}</span></div>}
      {selected && <HistoryDetail record={selected} onClose={() => setSelected(null)} />}
    </DataPageShell>
  );
}

function HistoryDetail({ record, onClose }: { record: StudyRecord; onClose: () => void }) {
  const { t } = useLanguage();
  const [notice, setNotice] = useState('');

  const copyMatches = async () => {
    const text = record.segments.filter((segment) => segment.matched)
      .map((segment) => `${segment.source}: ${segment.meaning}`).join('\n');
    if (!text) {
      setNotice(t('Chưa có mục khớp trong từ điển.'));
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t('Đã sao chép'));
    } catch {
      setNotice(t('Không thể sao chép nội dung trên thiết bị này.'));
    }
  };

  const listenToMatches = () => {
    const meanings = record.segments.filter((segment) => segment.matched).map((segment) => segment.meaning);
    if (!meanings.length) {
      setNotice(t('Chưa có mục khớp trong từ điển.'));
      return;
    }
    if (!('speechSynthesis' in window)) {
      setNotice(t('Trình duyệt chưa hỗ trợ đọc thành tiếng.'));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(meanings.join('. '));
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="detail-drawer">
      <div className="drawer-head">
        <div><span className="eyebrow">{t('Tra từ điển')}</span><h2>{record.source}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label={t('Đóng chi tiết')}>×</button>
      </div>
      <span className="word-type">{t(record.language === 'tay' ? 'Tày' : 'Mường')} · {record.coverage}% {t('khớp từ điển')}</span>
      <div className="history-detail-block"><small>{t('Kết quả tra cứu')}</small>
        {record.segments.map((segment, index) => (
          <p key={`${segment.source}-${index}`}><strong>{segment.source}</strong>: {segment.matched ? segment.meaning : t('Chưa có trong từ điển')}</p>
        ))}
      </div>
      {notice && <div className="form-success" role="status">{notice}</div>}
      <div className="empty-actions">
        <button className="secondary-button" onClick={() => void copyMatches()}><Copy size={17} /> {t('Sao chép')}</button>
        <button className="secondary-button" onClick={listenToMatches}><Volume2 size={17} /> {t('Nghe nghĩa')}</button>
        <button className="primary-button" onClick={onClose}>{t('Đóng')}</button>
      </div>
    </div>
  );
}
