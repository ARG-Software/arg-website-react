import {
  Navbar,
  Footer,
  CTASection,
  SectionDivider,
  arrowSvg,
  PlaceholderVisual,
  PartnerRow,
  SEO,
} from '../components';
import { SubpageHero } from '../components/hero/SubpageHero';
import { useScrollAnimations } from '../hooks';
import { trackMailto, trackSocial } from '../hooks/useAnalytics';
import '../styles/team.css';

export default function TeamPage() {
  useScrollAnimations(); // Scroll animations

  const FOUNDERS = [
    {
      name: 'Jose Antunes',
      role: 'Co-Founder · Software Developer',
      description:
        'Jose leads the engineering vision at ARG. With deep expertise in backend architecture, cloud infrastructure, and scalable system design, he ensures every product is built to hold up under real-world demands — and to grow with the businesses that rely on it.',
      imgSrc:
        'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9.jpg',
      imgSrcSet:
        'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9-p-500.jpg 500w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9-p-800.jpg 800w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9.jpg 1024w',
      linkedin: 'https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/',
    },
    {
      name: 'Rui Rocha',
      role: 'Co-Founder · Software Developer',
      description:
        'Rui drives technical direction and client relationships at ARG. His expertise spans full-stack development and system architecture, with a track record of turning complex requirements into clean, production-ready solutions that stand the test of time.',
      imgSrc:
        'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1).jpg',
      imgSrcSet:
        'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1)-p-500.jpg 500w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1)-p-800.jpg 800w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1).jpg 1024w',
      linkedin: 'https://www.linkedin.com/in/ruirochawork/',
    },
  ];

  const TEAM = [
    {
      name: 'Sofia Mendes',
      role: 'Lead UX/UI Designer',
      department: 'Design',
      description:
        'Sofia shapes the look and feel of everything ARG ships. From early discovery workshops to polished design systems, she bridges user needs and technical constraints into interfaces that feel inevitable — and that users actually enjoy.',
      imgSrc: null,
      linkedin: null,
    },
    // {
    //   name: 'Miguel Ferreira',
    //   role: 'Frontend Lead',
    //   department: 'Engineering',
    //   description:
    //     "Miguel owns the frontend layer across ARG's most demanding projects. He specialises in performance-first React architecture and motion design, transforming static designs into fast, accessible, cross-device experiences.",
    //   imgSrc: null,
    //   linkedin: null,
    // },
    // {
    //   name: 'Ana Costa',
    //   role: 'Backend Lead',
    //   department: 'Engineering',
    //   description:
    //     "Ana architects the data and API layers that power ARG's scalable platforms. From distributed systems to real-time event pipelines, she ensures everything runs reliably — at any load, on any given Friday.",
    //   imgSrc: null,
    //   linkedin: null,
    // },
    // {
    //   name: 'Diogo Neves',
    //   role: 'DevOps & Infrastructure Lead',
    //   department: 'Infrastructure',
    //   description:
    //     'Diogo keeps the lights on and the cloud costs down. He designs infrastructure across AWS and Azure, builds CI/CD pipelines, and sets up the monitoring that gives every team the confidence to ship fast without breaking things.',
    //   imgSrc: null,
    //   linkedin: null,
    // },
  ];

  return (
    <>
      <SEO
        title="Our Team"
        description="Meet the engineers and founders behind Arg Software. A team of experienced developers passionate about building exceptional software for fintech and SaaS."
        path="/team"
      />
      <div className="page-wrapper w-clearfix">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          {/* HERO */}
          <SubpageHero title={["You can't do anything", 'without brains.']} />

          {/* FOUNDERS INTRO */}
          <section className="tp-intro-section background-color-white">
            <div
              className="pp-partners-inner"
              style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}
            >
              <div className="tp-intro-center">
                <h2 className="tp-intro-heading">
                  <div className="heading_line">
                    <span
                      className="tp-intro-line text-color-gradiant"
                      style={{ transform: 'translate3d(0, 120%, 0) rotateZ(3deg)' }}
                    >
                      More than a team,
                    </span>
                  </div>
                  <div className="heading_line">
                    <span
                      className="tp-intro-line"
                      style={{
                        transform: 'translate3d(0, 120%, 0) rotateZ(3deg)',
                        transitionDelay: '0.16s',
                      }}
                    >
                      your innovation partners.
                    </span>
                  </div>
                </h2>
              </div>
            </div>
          </section>

          {/* FOUNDERS SPOTLIGHT */}
          <section className="tp-founders-section">
            <div className="tp-founders-inner">
              <div className="tp-founders-grid">
                {FOUNDERS.map((f, i) => (
                  <div
                    key={i}
                    className="tp-founder-card pp-animate"
                    style={{ transitionDelay: `${i * 0.12}s` }}
                  >
                    <div className="tp-founder-photo">
                      <img
                        src={f.imgSrc}
                        srcSet={f.imgSrcSet}
                        sizes="(max-width: 767px) 100vw, 50vw"
                        loading="lazy"
                        alt={f.name}
                      />
                    </div>
                    <div className="tp-founder-body">
                      <div className="tp-founder-meta">
                        <h2 className="tp-founder-name">{f.name}</h2>
                        <div
                          className="subtitle_tag-wrapper"
                          style={{
                            borderColor: 'rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.45)',
                          }}
                        >
                          <div>Co-Founder</div>
                        </div>
                      </div>
                      <p className="tp-founder-role-tag">{f.role}</p>
                      <div className="tp-founder-divider"></div>
                      <p className="tp-founder-desc">{f.description}</p>
                      <div className="tp-founder-actions">
                        <a
                          href={f.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-button w-inline-block"
                          onClick={() => trackSocial('linkedin', 'team_page')}
                        >
                          <div className="text-button_list is-dark">
                            <div
                              className="text-button_text"
                              style={{ color: 'rgba(255,255,255,0.5)' }}
                            >
                              LinkedIn
                            </div>
                            <div
                              className="arrow_icon-embed w-embed"
                              style={{ color: 'rgba(255,255,255,0.5)' }}
                            >
                              {arrowSvg}
                            </div>
                          </div>
                          <div className="text-button_list is-animated is-dark">
                            <div className="text-button_text" style={{ color: '#fff' }}>
                              View profile ↗
                            </div>
                            <div className="arrow_icon-embed w-embed" style={{ color: '#fff' }}>
                              {arrowSvg}
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* TEAM LIST */}
          <section className="pp-partners-section background-color-white">
            <div className="pp-partners-inner">
              {TEAM.map((member, i) => (
                <PartnerRow
                  key={i}
                  name={member.name}
                  description={member.description}
                  tag={member.department}
                  role={member.role}
                  flip={i % 2 === 1}
                >
                  <PlaceholderVisual name={member.name} />
                </PartnerRow>
              ))}

              <div className="tp-hiring pp-animate">
                <div className="tp-hiring-left">
                  <div className="tp-hiring-eyebrow">We're growing</div>
                  <p className="tp-hiring-title">
                    Want to join the team?
                    <br />
                    <span>We'd love to hear from you.</span>
                  </p>
                </div>
                <div className="tp-hiring-right">
                  <a
                    href="mailto:hello@arg.software?subject=I%20want%20to%20join%20ARG"
                    className="button-base w-inline-block"
                    onClick={() => trackMailto('join_team', 'team_page')}
                  >
                    <div className="button-base_text_wrap">
                      <div className="button-base__button-text">Get in touch</div>
                      <div className="button-base__button-text is-animated">hello@arg.software</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </section>

          <div className="page-cta-wrapper">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title="Ready to build"
              titleHighlight="with this team?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
