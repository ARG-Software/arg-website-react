import React from 'react';
import { linkedinSvg } from '../../../components/icons/SocialIcons';
import { trackSocial } from '../../../utils/analytics';
import { getPersonLinkedInLink, PERSON_KEYS } from '../../../services/linksService';
import HOMEPAGE from '../../../data/homePage.json';

function resolveTeamMembers(members) {
  return members.map(member => ({
    ...member,
    linkedin: getPersonLinkedInLink(PERSON_KEYS[member.personKey]),
  }));
}

export function TeamSection({ className = '', content = HOMEPAGE.team }) {
  const teamMembers = resolveTeamMembers(content.members);

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
              <div className="subtitle_tag-wrapper hide-mobile-landscape">{content.eyebrow}</div>
            </div>
            <div className="team-content">
              <div className="team_header-wrapper">
                <div className="heading_wrap">
                  <h2 className="home-section-title" data-animate="fade-up" data-animate-order="1">
                    {content.title}
                  </h2>
                </div>
                <div className="padding-bottom padding-30-44"></div>
                <p className="text-color-grey" data-animate-order="2">
                  {content.intro}
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
