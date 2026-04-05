import AppLink from '../../../components/links/AppLink';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { trackArticleClick } from '../../../hooks/useAnalytics';
import { SectionDivider } from '../../../components/layout/SectionDivider';

function displayArticleGridRow(articleRows = [], marginTop = '0') {
  return (
    <div className="articles-promo_cards-grid" style={{ marginTop }}>
      {articleRows.map(article => (
        <AppLink
          key={article.slug}
          to={`/articles/${article.slug}`}
          className="articles-promo_card-small"
          onClick={() => trackArticleClick(article.slug, article.title, 'homepage_promo_card')}
        >
          <h4 className="articles-promo_card-title-small">{article.title}</h4>
          <div className="subtitle_tag-wrapper is--white" style={{ width: 'fit-content' }}>
            <div>{article.tag}</div>
          </div>

          <div className="articles-promo_card-meta-bottom">
            <span className="articles-promo_card-date-small">{article.date}</span>
            <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
          </div>
        </AppLink>
      ))}
    </div>
  );
}

export function ArticlesPromoSection({ articles, className = '' }) {
  // Separate first article as hero, next 6 as cards (3 + 3)
  const heroArticle = articles[0];
  const firstRowArticles = articles.slice(1, 4);
  const secondRowArticles = articles.slice(4, 7);

  return (
    <section
      id="articles-promo"
      className={`section_articles-promo padding-section-medium ${className}`.trim()}
      style={{ backgroundColor: '#0c002e' }}
    >
      <div className="padding-global">
        <div className="container-large">
          <div className="articles-promo_inner">
            <div className="social-section_header">
              <div>
                <h2 className="heading-style-h2" style={{ color: '#fff' }}>
                  We write about what we build
                </h2>
              </div>
              <div className="subtitle_tag-wrapper is--white hide-mobile-landscape">
                <div>Articles</div>
              </div>
            </div>
            {/* Hero Article - Full width */}
            <AppLink
              to={`/articles/${heroArticle.slug}`}
              className="articles-promo_hero"
              onClick={() =>
                trackArticleClick(heroArticle.slug, heroArticle.title, 'homepage_promo_hero')
              }
            >
              <div className="articles-promo_hero-content">
                {/* Left: Title (60% on desktop) */}
                <h3 className="articles-promo_hero-title">{heroArticle.title}</h3>

                {/* Right: Metadata (40% on desktop) */}
                <div className="articles-promo_hero-meta">
                  {/* Tag pill */}
                  <div className="subtitle_tag-wrapper is--white">
                    <div>{heroArticle.tag}</div>
                  </div>

                  {/* Date + Arrow (vertically stacked) */}
                  <div className="articles-promo_hero-meta-bottom">
                    <span className="articles-promo_hero-date">{heroArticle.date}</span>
                    <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                  </div>
                </div>
              </div>
            </AppLink>
            {displayArticleGridRow(firstRowArticles)}
            {displayArticleGridRow(secondRowArticles, '1.5rem')}

            <div className="articles-promo_footer">
              <AppLink to="/articles" className="text-button w-inline-block">
                <div className="text-button_list">
                  <div className="text-button_text text-no-wrap">Read all articles</div>
                  <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated">
                  <div className="text-button_text text-no-wrap">Browse the blog</div>
                  <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                </div>
              </AppLink>
            </div>
          </div>
        </div>
      </div>
      <SectionDivider variant="light" hideOnMobile={true} />
    </section>
  );
}
