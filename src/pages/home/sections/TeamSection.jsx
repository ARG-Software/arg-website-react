import React from 'react';
import { linkedinSvg } from '../../../components/icons/SocialIcons';
import { trackSocial } from '../../../utils/analytics';
import { getPersonLinkedInLink, PERSON_KEYS } from '../../../services/linksservice';

const teamMembers = [
  {
    name: 'Jose Antunes',
    role: 'Co-founder, Software Engineer',
    linkedin: getPersonLinkedInLink(PERSON_KEYS.JOSE),
    imgSrc:
      'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9.jpg',
    imgSrcSet:
      'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9-p-500.jpg 500w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9-p-800.jpg 800w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9.jpg 1024w',
    imgAlt: 'JoseAntunes - ARG',
  },
  {
    name: 'Rui Rocha',
    role: 'Co-founder, Software Engineer',
    linkedin: getPersonLinkedInLink(PERSON_KEYS.RUI),
    imgSrc:
      'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1).jpg',
    imgSrcSet:
      'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1)-p-500.jpg 500w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1)-p-800.jpg 800w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1).jpg 1024w',
    imgAlt: 'RuiRocha - ARG',
  },
];

export function TeamSection({ className = '' }) {
  return (
    <section
      id="team"
      className={`section_team background-color-white padding-section-large border-radius-bottom ${className}`.trim()}
      data-animate-scope
      data-animate-trigger="scroll"
      data-animate-default-preset="fade-up"
      data-animate-default-stagger="120"
    >
      <div className="padding-global">
        <div className="container-medium">
          <div className="team-component">
            <div id="team-subtitle-grid" data-animate-order="0">
              <div className="subtitle_tag-wrapper">Meet Our Team</div>
            </div>
            <div className="team-content">
              <div className="team_header-wrapper">
                <div className="overflow-hidden">
                  <div className="heading_wrap">
                    <h2
                      className="home-section-title"
                      data-animate="fade-up"
                      data-animate-order="1"
                    >
                      Built by Engineers
                    </h2>
                  </div>
                </div>
                <div className="padding-bottom padding-30-44"></div>
                <p className="text-color-grey" data-animate-order="2">
                  ARG is led by senior engineers who stay close to the architecture, code, and
                  production reality. You do not get layers of account management. You work with the
                  people responsible for the technical decisions.
                </p>
              </div>
              <div className="padding-bottom padding-80-74"></div>
              <div className="team_items-wrapper">
                {teamMembers.map((m, i) => (
                  <div
                    key={i}
                    className="team-item"
                    data-animate-scope
                    data-animate-default-preset="fade-up"
                    data-animate-default-stagger="80"
                  >
                    <div
                      className="team_image-wrapper"
                      data-animate="overlay-reveal"
                      data-animate-order={i + 3}
                    >
                      <img
                        src={m.imgSrc}
                        srcSet={m.imgSrcSet}
                        sizes="(max-width: 1024px) 100vw, 1024px"
                        loading="lazy"
                        alt={m.imgAlt}
                        className="team_image"
                        width="1024"
                        height="1024"
                      />
                      <div className="team_image-overlay"></div>
                    </div>
                    <div className="team-item_text">
                      <h3
                        className="heading-style-h5"
                        data-animate="fade-up"
                        data-animate-order="0"
                      >
                        {m.name}
                      </h3>
                      <div className="padding-bottom padding-small"></div>
                      <div className="subtitle-team" data-animate="fade-up" data-animate-order="1">
                        {m.role}
                      </div>
                      <div className="padding-bottom padding-small"></div>
                      <a
                        aria-label={`${m.name} on LinkedIn`}
                        href={m.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="team-social-link"
                        onClick={() => trackSocial('linkedin', 'homepage_team')}
                      >
                        <span className="team-social-link-icon">{linkedinSvg}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
