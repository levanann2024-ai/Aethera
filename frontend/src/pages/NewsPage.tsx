import { useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Newspaper, Sprout } from 'lucide-react';
import { DataPageShell } from '@/components/AppLayout';
import { mockNewsArticles } from '@/data/mockData';
import type { NewsArticle } from '@/data/mockData';
import { useLanguage } from '@/i18n/useLanguage';

export function NewsPage() {
  const { t } = useLanguage();
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  if (selectedArticle) {
    return (
      <DataPageShell
        eyebrow={selectedArticle.category}
        title={selectedArticle.title}
        description={selectedArticle.excerpt}
      >
        <article className={`news-article news-article-${selectedArticle.accent}`}>
          <div className="news-article-cover">
            <span><Newspaper size={19} /> {t('Bài viết minh họa')}</span>
            <Sprout size={58} strokeWidth={1.1} />
          </div>
          <div className="news-article-meta"><span>{t(selectedArticle.date)}</span><span><Clock3 size={15} /> {t(selectedArticle.readTime)}</span></div>
          <div className="news-article-content">
            {selectedArticle.content.map((paragraph) => <p key={paragraph}>{t(paragraph)}</p>)}
          </div>
          <button className="secondary-button" onClick={() => setSelectedArticle(null)}><ArrowLeft size={17} /> {t('Quay lại tin tức')}</button>
        </article>
      </DataPageShell>
    );
  }

  return (
    <DataPageShell
      eyebrow="Từ ngữ, văn hóa và cộng đồng"
      title="Tin tức & câu chuyện"
      description="Gợi ý học tập và những câu chuyện về việc gìn giữ tiếng nói địa phương. Nội dung hiện là bản minh họa giao diện."
    >
      <div className="news-featured">
        <div className="news-featured-copy">
          <span className="news-category">{t(mockNewsArticles[0].category)}</span>
          <h2>{t(mockNewsArticles[0].title)}</h2>
          <p>{t(mockNewsArticles[0].excerpt)}</p>
          <button className="primary-button" onClick={() => setSelectedArticle(mockNewsArticles[0])}>
            {t('Đọc câu chuyện')} <ArrowRight size={17} />
          </button>
        </div>
        <div className="news-featured-art"><Sprout size={92} strokeWidth={1.05} /><span>Ngôn ngữ · Ký ức · Kết nối</span></div>
      </div>

      <div className="news-list-heading">
        <div><span className="eyebrow"><span className="eyebrow-line" /> {t('Mới từ Aethera')}</span><h2>{t('Khám phá thêm')}</h2></div>
        <span>{mockNewsArticles.length} {t('bài viết')}</span>
      </div>
      <div className="news-grid">
        {mockNewsArticles.map((article, index) => (
          <article className={`news-card news-card-${article.accent}`} key={article.id}>
            <div className="news-card-art"><span>{String(index + 1).padStart(2, '0')}</span><Sprout size={38} strokeWidth={1.2} /></div>
            <div className="news-card-body">
              <div className="news-card-meta"><span className="news-category">{t(article.category)}</span><span><Clock3 size={14} /> {t(article.readTime)}</span></div>
              <h3>{t(article.title)}</h3>
              <p>{t(article.excerpt)}</p>
              <button className="news-read-link" onClick={() => setSelectedArticle(article)}>{t('Đọc tiếp')} <ArrowRight size={16} /></button>
            </div>
          </article>
        ))}
      </div>
      <div className="news-disclaimer"><Newspaper size={17} /><span>{t('Đây là nội dung mẫu để xem trước trang tin tức, chưa phải tin tức cập nhật từ nguồn bên ngoài.')}</span></div>
    </DataPageShell>
  );
}
