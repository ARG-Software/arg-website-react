import React, { useEffect, useState } from 'react';

export const ProjectModal = ({ project, isOpen, onClose }) => {
  const [animationState, setAnimationState] = useState('closed');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (window.lenis) window.lenis.stop();
      setAnimationState('opening');
      
      setTimeout(() => setAnimationState('open'), 50);
    } else {
      setAnimationState('closed');
    }

    return () => {
      if (!isOpen) {
        document.body.style.overflow = "auto";
        if (window.lenis) window.lenis.start();
      }
    };
  }, [isOpen]);

  const handleClose = () => {
    setAnimationState('closing');
    setTimeout(() => {
      onClose();
      document.body.style.overflow = "auto";
      if (window.lenis) window.lenis.start();
    }, 1250);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') handleClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (!isOpen && animationState === 'closed') return null;

  return (
    <div className="modal_wrap background-color-white">
      <div 
        className="overlay" 
        onClick={handleClose}
        style={{
          opacity: animationState === 'open' ? '100%' : '0%',
          transition: 'opacity 250ms ease-in-out'
        }}
      />
      <div 
        className="modal"
        style={{
          transition: 'all 500ms ease-in-out',
          ...(animationState === 'open' ? {
            top: '5%',
            left: '50%',
            width: window.innerWidth <= 479 ? '90%' : '80%',
            transform: 'translate(-50%, 0%)',
            opacity: '100%'
          } : {})
        }}
      >
        <div className="projects_item">
          <div className="projects_modal-close_btn" onClick={handleClose}>
            <div className="projects_modal-close_wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 32 32" fill="none">
                <g clipPath="url(#clip0_3_9822)">
                  <path d="M17.4141 16L24 9.4141L22.5859 8L16 14.5859L9.4143 8L8 9.4141L14.5859 16L8 22.5859L9.4143 24L16 17.4141L22.5859 24L24 22.5859L17.4141 16Z" fill="white"/>
                </g>
                <defs>
                  <clipPath id="clip0_3_9822">
                    <rect width="32" height="32" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>

          <div className="projects_item_display" style={{
            transition: 'all 250ms ease-in-out',
            backgroundColor: animationState === 'open' ? '#FFFFFF' : '#ededed'
          }}>
            <div className="projects_modal_indication is-mobile" 
              onClick={handleClose}
              style={{
                opacity: animationState === 'open' ? '100' : '0',
                transition: 'opacity 600ms ease-in-out'
              }}>
              <div className="projects_modal_text">Tap</div>
              <div className="projects_modal_text-wrap">
                <div className="projects_modal_text">Here</div>
              </div>
              <div className="projects_modal_text">to close</div>
            </div>
            <div className="projects_item_visual">
              <img src={project.image} loading="lazy" alt="" className="projects_visual_img"/>
            </div>
          </div>

          <div className="projects_item_content" style={{
            opacity: animationState === 'open' ? '100' : '0',
            transition: 'opacity 600ms ease-in-out'
          }}>
            <div className="projects_item_tag">
              <div className="test_tag_text">Problem</div>
            </div>
            <div className="padding-bottom padding-30"></div>
            <p className="test_item_paragraph text-align-center">{project.problem}</p>
            <div className="padding-bottom padding-42"></div>
            <a href={project.liveUrl} className="test_item_link" target="_blank" rel="noopener noreferrer">
              View Live Site ↗
            </a>
            <div className="padding-bottom padding-42"></div>
            {project.showcaseImage && (
              <div className="projects_item_visual is-showcase">
                <img loading="lazy" src={project.showcaseImage} alt="" className="projects_item_sec-img"/>
              </div>
            )}
          </div>

          <div className="projects_item_content is-padding-bottom is-white-bg" style={{
            opacity: animationState === 'open' ? '100' : '0',
            transition: 'opacity 600ms ease-in-out'
          }}>
            <div className="projects_item_tag">
              <div className="test_tag_text">Solution</div>
            </div>
            <div className="padding-bottom padding-30"></div>
            <p className="test_item_paragraph text-align-center is-bold">{project.solutionBold}</p>
            <p className="test_item_paragraph text-align-center">{project.solution}</p>
            <div className="padding-bottom padding-30"></div>
            
            {project.techLogos && (
              <div className="projects_item_logo-wrap">
                <div className="projects_item_list">
                  {project.techLogos.map((logo, index) => (
                    <div key={index} className="projects_list_logo">
                      <img loading="lazy" src={logo} alt="" className="projects_logo_image"/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="padding-bottom padding-42"></div>
            <div className="projects_item_stack">
              <div className="projects_stack_text is-medium">Tech Stack:</div>
              <div className="projects_stack_text">{project.techStack}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
