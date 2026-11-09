import { useEffect, useMemo, useState } from 'react';
import { Footer } from '@components/layout/Footer';
import { Navbar } from '@components/navigation/Navbar';
import { PageHeader } from '@components/headers/PageHeader';
import { SEO } from '@components/seo/SEO';
import { CTASection } from '@components/layout/CTASection';
import { ChangelogTimeline } from '@components/content/ChangelogTimeline';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { Pill } from '@ui/pills/Pill.jsx';
import { renderArticleBlock } from '@components/content/ArticleBlock';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackOutbound } from '@services/analytics';
import { parseBlocks } from '@utils/blog';
import { getBrowserStoreLink } from '../services/linksService';
import { fetchArchitectReleases } from '../services/architectReleasesService';
import PAGE from '../data/auditPage.json';
import '../styles/audit.css';
import '../styles/blog.css';

const CHANGELOG_PAGE = PAGE.changelogPage;

export default function ChangelogPage() {
  const [releases, setReleases] = useState([]);
  const [status, setStatus] = useState('loading');
  const [year, setYear] = useState('');
  const [openId, setOpenId] = useState('');
  const chromeStoreUrl = getBrowserStoreLink('chrome');

  useTimeOnPage('/audit/changelog/');
  useScrollAnimations();

  useEffect(() => {
    let cancelled = false;

    fetchArchitectReleases()
      .then(result => {
        if (cancelled) return;
        const records = result.records || [];
        const hash = window.location.hash.slice(1);
        const match = records.find(release => releaseAnchor(release.tagName) === hash);
        setReleases(records);
        setYear(match ? releaseYear(match.publishedAt) : latestYear(records));
        setOpenId(match?.id || '');
        setStatus('ready');
        if (match) {
          requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
        }
      })
      .catch(() => {
        if (cancelled) return;
        setReleases([]);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(() => uniqueYears(releases), [releases]);
  const visible = useMemo(
    () => (year ? releases.filter(release => releaseYear(release.publishedAt) === year) : releases),
    [releases, year]
  );

  function selectRelease(release) {
    setYear(releaseYear(release.publishedAt));
    setOpenId(release.id);
    document.getElementById(releaseAnchor(release.tagName))?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <>
      <SEO
        title={CHANGELOG_PAGE.seo.title}
        description={CHANGELOG_PAGE.seo.description}
        path="/audit/changelog/"
        breadcrumbs={CHANGELOG_PAGE.hero.breadcrumbs}
      />
      <div className="page-wrapper au-page">
        <Navbar position="absolute" isHomePage={true} />

        <main id="main" className="main-wrapper background-color-dark">
          <PageHeader
            title={CHANGELOG_PAGE.hero.title}
            subtitle={CHANGELOG_PAGE.hero.subtitle}
            breadcrumbs={CHANGELOG_PAGE.hero.breadcrumbs}
            size="small"
          />

          <div data-animate-scope data-animate-default-preset="fade-up">
            <section
              id="changelog"
              className="au-section padding-section-large border-radius-top border-radius-bottom background-color-white"
            >
              <div className="container padding-global au-inner">
                {status === 'loading' ? <p className="au-lede">{CHANGELOG_PAGE.loading}</p> : null}
                {status === 'error' ? <p className="au-lede">{CHANGELOG_PAGE.error}</p> : null}
                {status === 'ready' && releases.length === 0 ? (
                  <p className="au-lede">{CHANGELOG_PAGE.empty}</p>
                ) : null}
                {status === 'ready' && releases.length > 0 ? (
                  <>
                    <header className="au-cl-intro">
                      <p className="au-kicker">
                        {visible.length} {CHANGELOG_PAGE.updatesLabel}
                      </p>
                    </header>

                    <ChangelogTimeline
                      releases={releases}
                      years={years}
                      selectedYear={year}
                      selectedId={openId}
                      onSelectYear={setYear}
                      onSelectRelease={selectRelease}
                      label={CHANGELOG_PAGE.timelineLabel}
                    />

                    <div className="au-cl-layout">
                      <aside className="au-cl-years" aria-label={CHANGELOG_PAGE.yearsLabel}>
                        {years.map(value => (
                          <button
                            key={value}
                            type="button"
                            className={value === year ? 'au-cl-year is-active' : 'au-cl-year'}
                            onClick={() => setYear(value)}
                          >
                            {value}
                          </button>
                        ))}
                      </aside>

                      <div className="au-cl-main">
                        <ol className="au-cl-list">
                          {visible.map(release => {
                            const isOpen = openId === release.id;
                            const kind = releaseKind(release.tagName);
                            return (
                              <li
                                key={release.id}
                                id={releaseAnchor(release.tagName)}
                                className={isOpen ? 'au-cl-item is-open' : 'au-cl-item'}
                              >
                                <time className="au-cl-date" dateTime={release.publishedAt}>
                                  {formatReleaseDate(release.publishedAt)}
                                </time>
                                <div className="au-cl-copy">
                                  <button
                                    type="button"
                                    className="au-cl-toggle"
                                    aria-expanded={isOpen}
                                    onClick={() => setOpenId(isOpen ? '' : release.id)}
                                  >
                                    <h3 className="au-cl-title">{releaseTitle(release)}</h3>
                                    <p className="au-cl-lede">{releaseLede(release)}</p>
                                  </button>
                                  <div className="au-cl-tags">
                                    <Pill variant="dark" size="xs">
                                      {release.tagName}
                                    </Pill>
                                    <Pill variant="outline" size="xs">
                                      {CHANGELOG_PAGE.kinds[kind]}
                                    </Pill>
                                  </div>
                                  {isOpen ? (
                                    <div className="au-cl-notes">
                                      {parseReleaseBody(release.body).map(renderArticleBlock)}
                                    </div>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          </div>

          <section className="page-cta-wrapper background-color-dark" id="page-cta">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title={CHANGELOG_PAGE.cta.title}
              titleHighlight={CHANGELOG_PAGE.cta.titleHighlight}
              buttonTextNotHover={CHANGELOG_PAGE.cta.buttonTextNotHover}
              buttonTextHover={CHANGELOG_PAGE.cta.buttonTextHover}
              buttonLink={chromeStoreUrl}
              onPrimaryClick={() =>
                trackOutbound(chromeStoreUrl, 'chrome', 'architect_changelog_cta')
              }
              secondButtonTextNotHover={CHANGELOG_PAGE.cta.secondButtonTextNotHover}
              secondButtonTextHover={CHANGELOG_PAGE.cta.secondButtonTextHover}
              secondButtonLink="/audit/"
              onSecondaryClick={() => trackCTA('audit_architect', 'architect_changelog_cta')}
              animationClass="au-animate"
              animate={true}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}

function parseReleaseBody(body) {
  const notes = String(body || '')
    .split('\n')
    .filter(line => !/full changelog/i.test(line))
    .filter(line => !/github\.com\/ARG-Software\/arg-architect/i.test(line))
    .join('\n')
    .replace(/^\s*\* /gm, '- ')
    .trim();

  return parseBlocks(notes);
}

function releaseTitle(release) {
  const name = String(release.name || '').trim();
  const tagName = String(release.tagName || '').trim();
  if (!name || name === tagName) return tagName;
  return name;
}

function releaseLede(release) {
  const lines = String(release.body || '')
    .replace(/\r/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .split('\n')
    .map(line =>
      line
        .replace(/^#+\s+/, '')
        .replace(/\*\*/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\s+by @[\w-]+ in https?:\S+/g, '')
        .trim()
    )
    .filter(Boolean)
    .filter(line => !/^what'?s changed$/i.test(line))
    .filter(line => !/^full changelog/i.test(line));

  return lines[0] || release.excerpt || '';
}

function releaseKind(tagName) {
  const match = String(tagName || '').match(/v?(\d+)\.(\d+)\.(\d+)/i);
  if (!match) return 'release';
  if (match[2] === '0' && match[3] === '0') return 'major';
  if (match[3] === '0') return 'minor';
  return 'patch';
}

function releaseAnchor(tagName) {
  return String(tagName || '').replace(/\s+/g, '-');
}

function releaseYear(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : String(date.getFullYear());
}

function uniqueYears(releases) {
  return [
    ...new Set(releases.map(release => releaseYear(release.publishedAt)).filter(Boolean)),
  ].sort();
}

function latestYear(releases) {
  return uniqueYears(releases).at(-1) || '';
}

function formatReleaseDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
