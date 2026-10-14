import { useEffect, useState } from 'react';
import { Check, Pin, Search, Volume2 } from 'lucide-react';
import { searchDictionary } from '@/backend/api';
import { useVocabularyProgress } from '@/backend/vocabulary-progress';
import { suggestedVocabulary } from '@/data/sampleDictionary';
import { useLanguage } from '@/i18n/useLanguage';
import { normalizeWord, speakText } from '@/pages/review/reviewUtils';
import type { DictionaryEntry, PhraseLookup } from '@/types/dictionary';
import { bestLookup } from './aiModes';

export function ExplainTool({ initialText = '' }: { initialText?: string }) {
  const { t } = useLanguage();
  const { pinned, setPinned } = useVocabularyProgress();
  const [text, setText] = useState(initialText);
  const [lookup, setLookup] = useState<PhraseLookup | null>(null);
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);

  const explain = async (value: string) => {
    const input = value.trim();
    if (!input) return;
    setBusy(true);
    try {
      const result = await bestLookup(input);
      setEntries(await searchDictionary(result.language));
      setLookup(result);
      const firstMatch = result.segments.findIndex((segment) => segment.matched);
      setSelected(firstMatch >= 0 ? firstMatch : 0);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialText) void explain(initialText);
    // Only the text passed in when the tool opens should run automatically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const segment = lookup?.segments[selected];
  const entry = segment?.matched ? entries.find((item) => normalizeWord(item.sourceTerm) === normalizeWord(segment.source)) : undefined;
  const understood = lookup ? lookup.segments.filter((item) => item.matched).length : 0;

  return (
    <div className="aix-explain">
      <form className="aix-paste" onSubmit={(event) => { event.preventDefault(); void explain(text); }}>
        <label htmlFor="aix-text">{t('Dán từ, câu hoặc đoạn bài học tiếng dân tộc')}</label>
        <textarea id="aix-text" value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={300} placeholder={t('Ví dụ: Slao nỏ')} />
        <div className="aix-paste-row">
          <div className="aix-chips">
            {suggestedVocabulary.map(({ word }) => (
              <button type="button" key={word} onClick={() => { setText(word); void explain(word); }}>{word}</button>
            ))}
          </div>
          <button type="submit" className="aix-primary" disabled={!text.trim() || busy}><Search size={17} /> {t(busy ? 'Đang tra từ...' : 'Giải thích')}</button>
        </div>
      </form>

      {lookup && (
        <section className="aix-result">
          <div className="aix-coverage">
            <span>{t('Em hiểu được')} <strong>{understood}/{lookup.segments.length}</strong> {t('từ')}</span>
            <div><i style={{ width: `${(understood / Math.max(lookup.segments.length, 1)) * 100}%` }} /></div>
          </div>

          <p className="aix-hint">{t('Chạm vào từng từ để xem nghĩa')}</p>
          <div className="aix-words">
            {lookup.segments.map((item, index) => (
              <button
                key={`${item.source}-${index}`}
                type="button"
                className={`aix-word ${item.matched ? 'aix-word-known' : 'aix-word-unknown'} ${index === selected ? 'aix-word-on' : ''}`}
                onClick={() => setSelected(index)}
                aria-pressed={index === selected}
              >
                {item.source}
              </button>
            ))}
          </div>

          {segment && (
            <article className="aix-detail">
              <div className="aix-detail-head">
                <strong>{segment.source}</strong>
                <button type="button" className="aix-icon" onClick={() => speakText(segment.source)} aria-label={t('Nghe từ này')}><Volume2 size={18} /></button>
              </div>
              {segment.matched ? (
                <>
                  <p className="aix-meaning">{segment.meaning}</p>
                  {segment.partOfSpeech && <small>{t(segment.partOfSpeech)}</small>}
                  {segment.example && <p className="aix-example">{segment.example}</p>}
                  {entry && (
                    <button type="button" className={`aix-pin ${pinned.has(entry.id) ? 'aix-pin-on' : ''}`} onClick={() => setPinned(entry.id, true)} disabled={pinned.has(entry.id)}>
                      {pinned.has(entry.id) ? <Check size={16} /> : <Pin size={16} />} {t(pinned.has(entry.id) ? 'Đã ghim vào sổ' : 'Ghim vào sổ từ vựng')}
                    </button>
                  )}
                </>
              ) : (
                <p className="aix-meaning aix-meaning-missing">{t('Từ này chưa có trong từ điển. Em hãy hỏi người nói bản ngữ nhé.')}</p>
              )}
            </article>
          )}

          {understood > 0 && (
            <div className="aix-whole">
              <small>{t('Nghĩa cả câu (ghép từ từ điển)')}</small>
              <p>{lookup.segments.map((item) => (item.matched ? item.meaning.replace(/[.。]$/, '') : '…')).join(' · ')}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
