import React from 'react';
import { trackSocial } from '../../hooks/useAnalytics';

const linkedinSvg = (
  <svg
    aria-hidden="true"
    role="img"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>LinkedIn</title>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const githubSvg = (
  <svg
    aria-hidden="true"
    role="img"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>GitHub icon</title>
    <path d="M12,2.2467A10.00042,10.00042,0,0,0,8.83752,21.73419c.5.08752.6875-.21247.6875-.475,0-.23749-.01251-1.025-.01251-1.86249C7,19.85919,6.35,18.78423,6.15,18.22173A3.636,3.636,0,0,0,5.125,16.8092c-.35-.1875-.85-.65-.01251-.66248A2.00117,2.00117,0,0,1,6.65,17.17169a2.13742,2.13742,0,0,0,2.91248.825A2.10376,2.10376,0,0,1,10.2,16.65923c-2.225-.25-4.55-1.11254-4.55-4.9375a3.89187,3.89187,0,0,1,1.025-2.6875,3.59373,3.59373,0,0,1,.1-2.65s.83747-.26251,2.75,1.025a9.42747,9.42747,0,0,1,5,0c1.91248-1.3,2.75-1.025,2.75-1.025a3.59323,3.59323,0,0,1,.1,2.65,3.869,3.869,0,0,1,1.025,2.6875c0,3.83747-2.33752,4.6875-4.5625,4.9375a2.36814,2.36814,0,0,1,.675,1.85c0,1.33752-.01251,2.41248-.01251,2.75,0,.26251.1875.575.6875.475A10.0053,10.0053,0,0,0,12,2.2467Z" />
  </svg>
);

const mediumSvg = (
  <svg
    aria-hidden="true"
    role="img"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Medium icon</title>
    <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.11-.53 5.62-1.18 5.62-.66 0-1.18-2.51-1.18-5.62s.52-5.62 1.18-5.62c.65 0 1.18 2.51 1.18 5.62z" />
  </svg>
);

const arrowSvg = (
  <svg viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1.77734 8.5L13.3329 8.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
    />
    <path
      d="M9.11133 3.83203L13.778 8.4987L9.11133 13.1654"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
    />
  </svg>
);

const closeSvg = (
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 32 32" fill="none">
    <g clipPath="url(#clip0_3_9822)">
      <path
        d="M17.4141 16L24 9.4141L22.5859 8L16 14.5859L9.4143 8L8 9.4141L14.5859 16L8 22.5859L9.4143 24L16 17.4141L22.5859 24L24 22.5859L17.4141 16Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_3_9822">
        <rect width="32" height="32" fill="currentColor" />
      </clipPath>
    </defs>
  </svg>
);

export function SocialIcons({ size = 'small', showLabel: _showLabel = false }) {
  const iconClass = size === 'small' ? 'icon-1x1-small socials-button w-embed' : '';

  return (
    <>
      <a
        aria-label="Linkedin"
        href="https://www.linkedin.com/company/arg-software"
        target="_blank"
        rel="noopener noreferrer"
        className="text-button w-inline-block"
        onClick={() => trackSocial('linkedin', 'footer')}
      >
        <div className={iconClass}>{linkedinSvg}</div>
      </a>
      <a
        aria-label="Github"
        href="https://github.com/ARG-Software"
        target="_blank"
        rel="noopener noreferrer"
        className="text-button w-inline-block"
        onClick={() => trackSocial('github', 'footer')}
      >
        <div className={iconClass}>{githubSvg}</div>
      </a>
      <a
        aria-label="Medium"
        href="https://medium.com/@arg-software"
        target="_blank"
        rel="noopener noreferrer"
        className="text-button w-inline-block"
        onClick={() => trackSocial('medium', 'footer')}
      >
        <div className={iconClass}>{mediumSvg}</div>
      </a>
    </>
  );
}

export function SocialIconsWithLabel() {
  return (
    <div className="footer_copywrite-buttons">
      <SocialIcons />
    </div>
  );
}

export { arrowSvg, linkedinSvg, githubSvg, mediumSvg, closeSvg };
