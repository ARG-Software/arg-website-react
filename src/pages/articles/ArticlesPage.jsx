import { useState, useEffect, useRef } from 'react';
import AppLink from '../../components/links/AppLink';
import { Navbar, Footer, CTASection, SectionDivider, arrowSvg, SEO } from '../../components';
import { SubpageHero } from '../../components/hero/SubpageHero';
import { useScrollAnimations } from '../../hooks';
import { trackArticleClick } from '../../hooks/useAnalytics';

import { loadArticlesMetadata } from '../../utils/articles';
import { ARTICLES_PER_PAGE } from '../../constants';
import '../../styles/articles.css';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ArticlesPage() {
  const [articles] = useState(() => loadArticlesMetadata());
  const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
  const [page, setPage] = useState(1);
  const startIdx = (page - 1) * ARTICLES_PER_PAGE;
  const paginatedArticles = articles.slice(startIdx, startIdx + ARTICLES_PER_PAGE);

  const listRef = useRef(null);

  // Re-observe new article rows whenever the page changes
  useEffect(() => {
    if (!listRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('alp-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    listRef.current.querySelectorAll('.alp-animate:not(.alp-visible)').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [page]);

  function goToPage(p) {
    setPage(p);
    const articlesList = document.getElementById('articles-list');
    if (articlesList) {
      articlesList.scrollIntoView({ behavior: 'smooth' });
    }
  }

  useScrollAnimations(); // Scroll animations including footer

  return (
    <>
      <SEO
        title="Articles & Insights"
        description="Technical articles, engineering insights, and best practices from the Arg Software team. Deep dives into architecture, TypeScript, .NET, DevOps, and more."
        path="/articles"
      />

      <div className="page-wrapper w-clearfix">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <SubpageHero title={['Articles from', 'the ARG team']} size="small" />

          <section id="articles-list" className="alp-section background-color-white">
            <div className="alp-inner" ref={listRef}>
              <div className="alp-count alp-animate">
                {articles.length} article{articles.length !== 1 ? 's' : ''}
              </div>

              {articles.length === 0 ? (
                <p className="alp-empty alp-animate">No articles yet — check back soon.</p>
              ) : (
                <>
                  {paginatedArticles.map((article, i) => (
                    <AppLink
                      key={article.slug}
                      to={`/articles/${article.slug}`}
                      className="alp-article-row alp-animate"
                      style={{ transitionDelay: `${i * 0.07}s` }}
                      onClick={() =>
                        trackArticleClick(article.slug, article.title, 'articles_list')
                      }
                    >
                      <div className="alp-row-meta">
                        <span className="alp-row-tag">{article.tag}</span>
                        {article.image && (
                          <img
                            src={article.image}
                            alt=""
                            className="alp-row-image"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="alp-row-body">
                        <h2 className="alp-row-title">{article.title}</h2>
                        <p className="alp-row-excerpt">{article.excerpt}</p>
                      </div>
                      <div className="alp-row-action">
                        <span className="alp-row-readtime">{article.readTime}</span>
                        <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                      </div>
                    </AppLink>
                  ))}

                  {totalPages > 1 && (
                    <nav className="alp-pagination" aria-label="Articles pagination">
                      <button
                        className="alp-pagination-arrow"
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        {arrowSvg}
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          className={`alp-pagination-num${p === page ? ' is-active' : ''}`}
                          onClick={() => goToPage(p)}
                          aria-label={`Page ${p}`}
                          aria-current={p === page ? 'page' : undefined}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        className="alp-pagination-arrow alp-pagination-arrow--next"
                        onClick={() => goToPage(page + 1)}
                        disabled={page === totalPages}
                        aria-label="Next page"
                      >
                        {arrowSvg}
                      </button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </section>

          <div className="page-cta-wrapper">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title="Ready to elevate"
              titleHighlight="your digital experience?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="alp-animate"
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
