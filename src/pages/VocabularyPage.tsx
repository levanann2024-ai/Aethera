import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { BookOpen, Download, FileUp, Lightbulb, Search, Volume2 } from 'lucide-react';
import { addDictionaryEntry, importDictionary, searchDictionary } from '@/backend/api';
import { parseDictionaryCsv } from '@/backend/dictionary-csv';
import { DataPageShell } from '@/components/AppLayout';
import { useLanguage } from '@/i18n/useLanguage';
import type { User } from '@/types/auth';
import type { DictionaryEntry, SourceLanguage } from '@/types/dictionary';

export function VocabularyPage({ user }: { user: User | null }) {
  const { t } = useLanguage();
  const [language, setLanguage] = useState<SourceLanguage>('tay');
  const [query, setQuery] = useState('');
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
    setEntries([]);
    searchDictionary(language, query)
      .then((result) => {
        if (active) {
          setEntries(result);
          setError('');
        }
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : t('Không thể tải từ điển.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [language, query, t]);

  const saveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setError(t('Đăng nhập để bổ sung từ điển.'));
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
      setNotice(t('Đã thêm mục từ.'));
      setEntries(await searchDictionary(language, query));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('Không thể lưu mục từ.'));
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!user) {
      setError(t('Đăng nhập để bổ sung từ điển.'));
      return;
    }
    if (file.size > 1024 * 1024) {
      setError(t('Tệp CSV không được vượt quá 1 MB.'));
      return;
    }

    setImportBusy(true);
    setError('');
    setNotice('');
    try {
      const csvEntries = parseDictionaryCsv(await file.text());
      const importedCount = await importDictionary(csvEntries);
      setNotice(`${t('Đã nhập thành công')} ${importedCount} ${t('mục từ')}.`);
      setEntries(await searchDictionary(language, query));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('Không thể nhập từ điển.'));
    } finally {
      setImportBusy(false);
    }
  };

  const speakWord = (word: string) => {
    if (!('speechSynthesis' in window)) {
      setError(t('Trình duyệt chưa hỗ trợ đọc thành tiếng.'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <DataPageShell
      eyebrow="Từ điển tiếng Tày/Mường"
      title="Từ vựng của tôi"
      description="Dữ liệu hiện tại là giả lập cho bản demo, không phải từ điển Tày/Mường đã được kiểm chứng."
    >
      <div className="dictionary-toolbar">
        <label>
          <span>{t('Phương ngữ')}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as SourceLanguage)}>
            <option value="tay">{t('Tày')}</option>
            <option value="muong">{t('Mường')}</option>
          </select>
        </label>
        <label className="search-field dictionary-search">
          <Search size={19} />
          <span className="sr-only">{t('Tìm từ vựng')}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Tìm từ, nghĩa hoặc cụm từ...')} />
        </label>
        <span className="data-count-inline">{entries.length} {t('mục từ')}</span>
      </div>

      {error && <div className="notice" role="alert">{t(error)}</div>}
      {notice && <div className="form-success" role="status">{notice}</div>}

      {loading && <div className="data-empty"><p>{t('Đang tải từ điển...')}</p></div>}
      {!loading && !error && !entries.length && (
        <div className="dictionary-empty">
          <BookOpen size={26} />
          <p>{t(query ? 'Không tìm thấy mục từ phù hợp.' : 'Từ điển này hiện chưa có nội dung.')}</p>
          <p>{t('Dùng từ demo1 hoặc demo2 để xem dữ liệu mẫu, hoặc thêm mục từ trong phiên này.')}</p>
        </div>
      )}
      {!loading && !!entries.length && (
        <div className="vocabulary-list">
          {entries.map((entry) => (
            <article className="dictionary-entry" key={entry.id}>
              <div className="dictionary-entry-main">
                <strong>{entry.sourceTerm}</strong>
                {entry.partOfSpeech && <span>{t(entry.partOfSpeech)}</span>}
              </div>
              <div className="dictionary-entry-meaning">
                <p>{entry.meaning}</p>
                {entry.example && <small>{entry.example}</small>}
              </div>
              <button className="quiet-button" onClick={() => speakWord(entry.meaning)} aria-label={`${t('Nghe nghĩa')}: ${entry.meaning}`}>
                <Volume2 size={19} />
              </button>
            </article>
          ))}
        </div>
      )}

      <section className="dictionary-manage">
        <div className="dictionary-manage-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> {t('Dữ liệu trình diễn')}</div>
            <h2>{t('Bổ sung từ điển')}</h2>
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
            {t('Nghĩa tiếng Việt')}
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
    </DataPageShell>
  );
}
