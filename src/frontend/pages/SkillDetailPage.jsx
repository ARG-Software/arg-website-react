import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent } from '@services/analytics';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { ContactSection } from '@components/layout/ContactSection';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { Pill, PillButton } from '@ui/pills/Pill.jsx';
import data from '../data/skills.json';
import SKILLS_PAGE from '../data/skillsPage.json';
import { getProjectBookingLink } from '../services/linksService';
import { buildSkillSchema } from '@utils/structuredData';
import '../styles/skills.css';

const { skills } = data;
const DETAIL = SKILLS_PAGE.detail;

export default function SkillDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const skill = skills.find(item => item.slug === slug);

  useScrollAnimations();
  useTimeOnPage(skill ? `/skills/${skill.slug}/` : '/skills/');

  useEffect(() => {
    if (!skill) navigate('/skills/', { replace: true });
  }, [skill, navigate]);

  if (!skill) return null;

  const breadcrumbs = [
    ...SKILLS_PAGE.hero.breadcrumbs,
    { label: skill.title, path: `/skills/${skill.slug}/` },
  ];

  return (
    <>
      <SEO
        title={skill.seoTitle}
        noSuffix
        description={skill.seoDescription}
        path={`/skills/${skill.slug}/`}
        breadcrumbs={breadcrumbs}
        jsonLd={buildSkillSchema(skill, data.repository)}
      />
      <div className="page-wrapper sk-page">
        <Navbar position="absolute" isHomePage={true} />

        <main id="main" className="main-wrapper">
          <PageHeader
            title={[skill.title, SKILLS_PAGE.hero.detailTitleLine]}
            breadcrumbs={breadcrumbs}
            sideItems={[
              { label: DETAIL.installLabel, href: '#install' },
              { label: DETAIL.doesLabel, href: '#what-it-does' },
              { label: DETAIL.usedWhenLabel, href: '#used-when' },
            ]}
            size="small"
          />

          <div data-animate-scope data-animate-default-preset="fade-up">
            <section
              id="overview"
              className="sk-section padding-section-large border-radius-top background-color-white"
            >
              <div className="container padding-global sk-inner">
                <div className="sk-detail-meta" data-animate="fade-up">
                  <span className="sk-detail-category">{skill.category}</span>
                  <div className="sk-card-tags">
                    {skill.tags.map(tag => (
                      <Pill key={tag} variant="outline" size="sm">
                        {tag}
                      </Pill>
                    ))}
                  </div>
                </div>
                <h2 className="sk-section-title" data-animate="fade-up">
                  {DETAIL.overviewLabel}
                </h2>
                <div className="sk-detail-body">
                  <p className="sk-detail-summary" data-animate="fade-up">
                    {skill.summary}
                  </p>
                </div>

                <h2 id="install" className="sk-section-title" data-animate="fade-up">
                  {DETAIL.installLabel}
                  <br />
                  <span className="text-color-gradiant">{DETAIL.installHighlight}</span>
                </h2>
                <div className="sk-detail-body">
                  <InstallCommand command={skill.installCommand} slug={skill.slug} />
                </div>
              </div>
              <SectionDivider variant="default" hideOnMobile={false} />
            </section>

            <section
              id="what-it-does"
              className="sk-section padding-section-large background-color-white"
            >
              <div className="container padding-global sk-inner">
                <h2 className="sk-section-title" data-animate="fade-up">
                  {DETAIL.doesLabel}
                  <br />
                  <span className="text-color-gradiant">{DETAIL.doesHighlight}</span>
                </h2>
                <div className="sk-detail-body sk-detail-block">
                  <ul data-animate="fade-up">
                    {skill.does.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <SectionDivider variant="default" hideOnMobile={false} />
            </section>

            <section
              id="used-when"
              className="sk-section padding-section-large border-radius-bottom background-color-white"
            >
              <div className="container padding-global sk-inner">
                <h2 className="sk-section-title" data-animate="fade-up">
                  {DETAIL.usedWhenLabel}
                  <br />
                  <span className="text-color-gradiant">{DETAIL.usedWhenHighlight}</span>
                </h2>
                <div className="sk-detail-body sk-detail-block">
                  <p data-animate="fade-up">{skill.usedWhen}</p>
                  <p data-animate="fade-up">{skill.body}</p>
                </div>
              </div>
            </section>
          </div>

          <ContactSection
            id="page-cta"
            title={SKILLS_PAGE.cta.title}
            titleHighlight={SKILLS_PAGE.cta.titleHighlight}
            buttonTextNotHover={SKILLS_PAGE.cta.buttonTextNotHover}
            buttonTextHover={SKILLS_PAGE.cta.buttonTextHover}
            buttonLink={getProjectBookingLink()}
            onPrimaryClick={() => trackCTA('book_meeting', 'skills_detail_cta')}
          />
        </main>

        <Footer />
      </div>
    </>
  );
}

function InstallCommand({ command, slug }) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      trackEvent('skill_install_copy', { skill: slug });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="sk-install" data-animate="fade-up">
      <div className="sk-install-header">
        <PillButton type="button" variant="dark" size="sm" onClick={copyCommand}>
          {copied ? DETAIL.copiedLabel : DETAIL.copyLabel}
        </PillButton>
      </div>
      <pre>
        <code>$ {command}</code>
      </pre>
    </div>
  );
}
