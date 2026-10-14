import { getSettings } from '@/backend/settings';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { BookOpen, Download, FileUp, Lightbulb, Pin, Search, Volume2 } from 'lucide-react';
import { addDictionaryEntry, importDictionary, searchDictionary } from '@/backend/api';
import { parseDictionaryCsv } from '@/backend/dictionary-csv';
import { useVocabularyProgress } from '@/backend/vocabulary-progress';
import { useLanguage } from '@/i18n/useLanguage';
import type { User } from '@/types/auth';
import type { DictionaryEntry, SourceLanguage } from '@/types/dictionary';
import { speakText } from './review/reviewUtils';
import './vocabulary.css';

type StatusFilter = 'all' | 'pinned' | 'todo' | 'done';

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pinned', label: 'Đã ghim' },
  { id: 'todo', label: 'Chưa thuộc' },
  { id: 'done', label: 'Đã thuộc' },
];

export function VocabularyPage({ user }: { user: User | null }) {
  const { t } = useLanguage();
  const { pinned, learned, setPinned, setLearned } = useVocabularyProgress();
  const [language, setLanguage] = useState<SourceLanguage>(() => getSettings().defaultLanguage);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [sourceTerm, setSourceTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [example, setExample] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    searchDictionary(language)
      .then((result) => { if (active) setEntries(result); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Không thể tải từ điển.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [language]);

  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return entries.filter((entry) => (
      (!needle || entry.sourceTerm.toLocaleLowerCase().includes(needle) || entry.meaning.toLocaleLowerCase().includes(needle))
      && (status === 'all'
        || (status === 'pinned' && pinned.has(entry.id))
        || (status === 'todo' && !learned.has(entry.id))
        || (status === 'done' && learned.has(entry.id)))
    ));
  }, [entries, query, status, pinned, learned]);

  const refreshEntries = async () => setEntries(await searchDictionary(language));

  const saveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setError('Đăng nhập để bổ sung từ điển.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await addDictionaryEntry({ sourceLanguage: language, sourceTerm, meaning, partOfSpeech, example });
      setSourceTerm('');
      setMeaning('');
      setPartOfSpeech('');
      setExample('');
      setNotice('Đã thêm mục từ.');
      await refreshEntries();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể lưu mục từ.');
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!user) {
      setError('Đăng nhập để bổ sung từ điển.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Tệp CSV không được vượt quá 1 MB.');
      return;
    }

    setImportBusy(true);
    setError('');
    setNotice('');
    try {
      const csvEntries = parseDictionaryCsv(await file.text());
      const importedCount = await importDictionary(csvEntries);
      setNotice(`${t('Đã nhập thành công')} ${importedCount} ${t('mục từ')}.`);
      await refreshEntries();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể nhập từ điển.');
    } finally {
      setImportBusy(false);
    }
  };

  const speakWord = (word: string) => {
    if (!speakText(word)) setError('Trình duyệt chưa hỗ trợ đọc thành tiếng.');
  };

  return (
    <div className="vb-page">
      <header className="vb-head">
        <div>
          <h1>{t('Sổ từ vựng')}</h1>
          <p>{t('Lưu lại những từ quan trọng để học và dùng lại dễ dàng hơn.')}</p>
        </div>
      </header>

      <div className="vb-toolbar">
        <label className="vb-search">
          <Search size={18} />
          <span className="sr-only">{t('Tìm từ vựng')}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Tìm từ trong sổ...')} />
        </label>
        <div className="vb-filters" role="group" aria-label={t('Lọc theo trạng thái')}>
          {statusFilters.map(({ id, label }) => (
            <button key={id} type="button" className={status === id ? 'vb-filter-on' : ''} aria-pressed={status === id} onClick={() => setStatus(id)}>{t(label)}</button>
          ))}
        </div>
        <select className="vb-language" value={language} onChange={(event) => setLanguage(event.target.value as SourceLanguage)} aria-label={t('Phương ngữ')}>
          <option value="tay">{t('Tày')} → {t('Tiếng phổ thông')}</option>
          <option value="muong">{t('Mường')} → {t('Tiếng phổ thông')}</option>
        </select>
      </div>

      {error && <div className="notice" role="alert">{t(error)}</div>}
      {notice && <div className="form-success" role="status">{notice}</div>}

      {loading && <div className="vb-empty"><p>{t('Đang tải từ điển...')}</p></div>}
      {!loading && !error && !visibleEntries.length && (
        <div className="vb-empty">
          <BookOpen size={28} />
          <p>{t(query || status !== 'all' ? 'Không tìm thấy từ phù hợp.' : 'Từ điển này hiện chưa có nội dung.')}</p>
        </div>
      )}
      {!loading && visibleEntries.length > 0 && (
        <ul className="vb-list">
          {visibleEntries.map((entry) => {
            const isPinned = pinned.has(entry.id);
            const isLearned = learned.has(entry.id);
            return (
              <li className="vb-row" key={entry.id}>
                <strong className="vb-word">{entry.sourceTerm}</strong>
                <span className="vb-meaning">{entry.meaning}</span>
                <div className="vb-actions">
                  <label className={`vb-check ${isLearned ? 'vb-check-on' : ''}`}>
                    <input type="checkbox" checked={isLearned} onChange={(event) => setLearned(entry.id, event.target.checked)} />
                    <span>{t('Đã thuộc')}</span>
                  </label>
                  <button type="button" className="vb-listen" onClick={() => speakWord(entry.sourceTerm)} aria-label={`${t('Nghe')}: ${entry.sourceTerm}`}>
                    <Volume2 size={17} /> {t('Nghe')}
                  </button>
                  <button type="button" className={`vb-pin ${isPinned ? 'vb-pin-on' : ''}`} onClick={() => setPinned(entry.id)} aria-pressed={isPinned}>
                    <Pin size={16} /> {t(isPinned ? 'Đã ghim' : 'Ghim')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <details className="vb-contribute">
        <summary>{t('Bổ sung từ điển')}</summary>
        <section className="dictionary-manage">
          <div className="dictionary-manage-heading">
            <div>
              <p>{t('Mục từ thêm hoặc nhập chỉ lưu trong bộ nhớ của phiên demo này.')}</p>
            </div>
            <a className="secondary-button" href="/dictionary-template.csv" download>
              <Download size={18} /> {t('Tải tệp mẫu')}
            </a>
          </div>
          <label className="csv-import-button">
            <FileUp size={19} />
            {t(importBusy ? 'Đang nhập...' : 'Tải file từ điển CSV')}
            <input type="file" accept=".csv,text/csv" onChange={(event) => void importFile(event)} disabled={importBusy || !user} />
          </label>
          {!user && <p className="dictionary-signin-note">{t('Có thể tra từ khi chưa đăng nhập; cần đăng nhập để bổ sung dữ liệu.')}</p>}
          <form className="dictionary-entry-form" onSubmit={(event) => void saveEntry(event)}>
            <label>
              {t('Từ địa phương')}
              <input value={sourceTerm} onChange={(event) => setSourceTerm(event.target.value)} maxLength={120} required />
            </label>
            <label>
              {t('Tiếng phổ thông')}
              <input value={meaning} onChange={(event) => setMeaning(event.target.value)} maxLength={500} required />
            </label>
            <label>
              {t('Loại từ')}
              <input value={partOfSpeech} onChange={(event) => setPartOfSpeech(event.target.value)} maxLength={80} />
            </label>
            <label>
              {t('Ví dụ trong câu')}
              <input value={example} onChange={(event) => setExample(event.target.value)} maxLength={500} />
            </label>
            <button className="primary-button" type="submit" disabled={!user || busy}>
              <Lightbulb size={18} /> {t(busy ? 'Đang lưu...' : 'Thêm mục từ')}
            </button>
          </form>
        </section>
      </details>
    </div>
  );
}
