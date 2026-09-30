import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA, trackEvent } from '@services/analytics';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { CTASection } from '@components/layout/CTASection';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { Pill, PillButton } from '@ui/pills/Pill.jsx';
import data from '../data/skills.json';
import SKILLS_PAGE from '../data/skillsPage.json';
import { getProjectBookingLink } from '../services/linksService';
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
        title={skill.title}
        description={skill.summary}
        path={`/skills/${skill.slug}/`}
        breadcrumbs={breadcrumbs}
      />
      <div className="page-wrapper sk-page">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <PageHeader
            title={skill.title}
            breadcrumbs={breadcrumbs}
            sideItems={[
              { label: DETAIL.installLabel, href: '#install' },
              { label: DETAIL.doesLabel, href: '#what-it-does' },
              { label: DETAIL.usedWhenLabel, href: '#used-when' },
            ]}
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section className="sk-section padding-section-large background-color-white border-radius-all">
              <div className="container padding-global sk-inner sk-detail">
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

                <p className="sk-detail-summary" data-animate="fade-up">
                  {skill.summary}
                </p>

                <InstallCommand command={skill.installCommand} slug={skill.slug} />

                <div id="what-it-does" className="sk-detail-block" data-animate="fade-up">
                  <h2>{DETAIL.doesLabel}</h2>
                  <ul>
                    {skill.does.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div id="used-when" className="sk-detail-block" data-animate="fade-up">
                  <h2>{DETAIL.usedWhenLabel}</h2>
                  <p>{skill.usedWhen}</p>
                  <p>{skill.body}</p>
                </div>
              </div>
            </section>
          </div>

          <section className="page-cta-wrapper" id="page-cta">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title={SKILLS_PAGE.cta.title}
              titleHighlight={SKILLS_PAGE.cta.titleHighlight}
              mobileTitleHighlight={SKILLS_PAGE.cta.mobileTitleHighlight}
              buttonTextNotHover={SKILLS_PAGE.cta.buttonTextNotHover}
              buttonTextHover={SKILLS_PAGE.cta.buttonTextHover}
              animationClass="sk-animate"
              animate={true}
              buttonLink={getProjectBookingLink()}
              onPrimaryClick={() => trackCTA('book_meeting', 'skills_detail_cta')}
            />
          </section>
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
    <div id="install" className="sk-install" data-animate="fade-up">
      <div className="sk-install-header">
        <h2>{DETAIL.installLabel}</h2>
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
