import React from 'react';
import { linkedinSvg } from '../../../components/icons/SocialIcons';
import { trackSocial } from '../../../hooks/useAnalytics';

const teamMembers = [
  {
    name: 'Jose Antunes',
    role: 'CO-FOUNDER - Software developer',
    linkedin: 'https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/',
    imgId: 'd3f6571f-2a52-032a-a22f-d6dff7799496',
    nameId: 'a386420a-7b3b-4373-6fbb-83f62a51f900',
    roleId: '086b6308-ff71-22d6-13a2-67a7344d7305',
    imgSrc:
      'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9.jpg',
    imgSrcSet:
      'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9-p-500.jpg 500w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9-p-800.jpg 800w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9.jpg 1024w',
    imgAlt: 'JoseAntunes - ARG',
  },
  {
    name: 'Rui Rocha',
    role: 'CO-FOUNDER - Software developer',
    linkedin: 'https://www.linkedin.com/in/ruirochawork/',
    imgId: undefined,
    nameId: 'a928d8ee-7644-3514-7041-c8a3f97f1125',
    roleId: 'a928d8ee-7644-3514-7041-c8a3f97f1128',
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
      className={`section_team background-color-white padding-section-large ${className}`.trim()}
    >
      <div className="padding-global">
        <div className="container-medium">
          <div className="team-component">
            <div id="team-subtitle-grid">
              <div className="subtitle_tag-wrapper hide-mobile-landscape">Meet Our Team</div>
            </div>
            <div className="team-content">
              <div className="team_header-wrapper">
                <div className="overflow-hidden">
                  <div className="heading_wrap">
                    <h2 className="team_heading">You can't do anything without brains</h2>
                  </div>
                </div>
                <div className="padding-bottom padding-30-44"></div>
                <p
                  data-w-id="1164883d-f971-0a2c-2892-dc069aa3870b"
                  style={{ opacity: 0 }}
                  className="text-color-grey"
                >
                  More than a team — your innovation partners. Meet the passionate experts dedicated
                  to fueling your success.
                </p>
              </div>
              <div className="padding-bottom padding-80-74"></div>
              <div className="team_items-wrapper">
                {teamMembers.map((m, i) => (
                  <div key={i} className="team-item">
                    <div data-w-id={m.imgId} className="team_image-wrapper">
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
                        data-w-id={m.nameId}
                        style={{
                          transform:
                            'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                        }}
                        className="heading-style-h5"
                      >
                        {m.name}
                      </h3>
                      <div className="padding-bottom padding-small"></div>
                      <div
                        data-w-id={m.roleId}
                        style={{
                          transform:
                            'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                        }}
                        className="subtitle-team"
                      >
                        {m.role}
                      </div>
                      <div className="padding-bottom padding-small"></div>
                      <a
                        aria-label="Linkedin"
                        href={m.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-button w-inline-block"
                        data-w-id={`linkedin-${i}`}
                        style={{ opacity: 0 }}
                        onClick={() => trackSocial('linkedin', 'homepage_team')}
                      >
                        <div
                          className="icon-1x1-small socials-button w-embed"
                          style={{ color: '#000' }}
                        >
                          {linkedinSvg}
                        </div>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              {/* <div className="padding-bottom padding-80-74"></div>
                <TransitionLink to="/team" className="text-button w-inline-block">
                  <div className="text-button_list is-dark">
                    <div className="text-button_text">Meet the full team</div>
                    <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                  </div>
                  <div className="text-button_list is-animated is-dark">
                    <div className="text-button_text">See everyone</div>
                    <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                  </div>
                </TransitionLink> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
