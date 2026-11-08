import React, { useEffect, useRef, useState } from 'react';
import { trackFAQOpen } from '@services/analytics';
import HOMEPAGE from '../../../data/homePage.json';
import FAQ from '../../../data/faq.json';

const faqData = FAQ.items;

function renderAnswerBlock(block, index) {
  if (block.type === 'list') {
    return (
      <ul key={index}>
        {block.items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return <p key={index}>{block.text}</p>;
}

// Fill `faq.video` in homePage.json: `src` for a file in /public, or `embedUrl` for a player
// (that host must also be allowed in frame-src in public/_headers). Empty, it shows the frame.
// Only a play button shows at first; once the film plays, its controls appear on hover or focus
function FAQVideo({ video = {} }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);

  let media = <div className="faq_video-placeholder">Video</div>;
  if (video.embedUrl) {
    media = (
      <iframe
        src={video.embedUrl}
        title={video.title}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  } else if (video.src) {
    media = (
      <>
        <video
          ref={videoRef}
          src={video.src}
          poster={video.poster || undefined}
          title={video.title}
          controls={playing && hovered}
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <button
            type="button"
            className="faq_video-play"
            aria-label={`Play the ${video.title} film`}
            onClick={() => videoRef.current.play()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
            </svg>
          </button>
        )}
      </>
    );
  }

  return (
    <div
      className="faq_video"
      data-animate-order="0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {media}
    </div>
  );
}

export function FAQSection({ className = '', content = HOMEPAGE.faq, items = faqData }) {
  // Inlined useFAQAnimations hook
  useEffect(() => {
    const items = document.querySelectorAll('.faq_item');
    if (!items.length) return;

    items.forEach(item => {
      const button = item.querySelector('.faq_question');
      const answer = item.querySelector('.faq_answer');
      if (!button || !answer) return;

      answer.style.overflow = 'hidden';
      answer.style.maxHeight = '0';
      answer.style.transition = 'max-height 0.55s var(--ease-out-expo)';

      const questionText = button.querySelector('.faq_question_text');
      if (questionText) {
        questionText.style.transition = 'color 0.4s ease';
      }
    });

    const openItem = item => {
      const button = item.querySelector('.faq_question');
      const answer = item.querySelector('.faq_answer');
      const questionText = button?.querySelector('.faq_question_text');

      button.setAttribute('aria-expanded', 'true');
      item.classList.add('is-open');

      answer.style.maxHeight = answer.scrollHeight / 16 + 'rem';

      if (questionText) {
        questionText.style.background = 'var(--arg-gradient-primary)';
        questionText.style.WebkitBackgroundClip = 'text';
        questionText.style.backgroundClip = 'text';
        questionText.style.WebkitTextFillColor = 'transparent';
        questionText.style.color = 'transparent';
      }

      const onEnd = () => {
        if (item.classList.contains('is-open')) {
          answer.style.maxHeight = 'none';
        }
        answer.removeEventListener('transitionend', onEnd);
      };
      answer.addEventListener('transitionend', onEnd);
    };

    const closeItem = item => {
      const button = item.querySelector('.faq_question');
      const answer = item.querySelector('.faq_answer');
      const questionText = button?.querySelector('.faq_question_text');

      button.setAttribute('aria-expanded', 'false');
      item.classList.remove('is-open');

      answer.style.maxHeight = answer.scrollHeight / 16 + 'rem';
      answer.offsetHeight;
      answer.style.maxHeight = '0';

      if (questionText) {
        questionText.style.background = 'none';
        questionText.style.WebkitBackgroundClip = 'unset';
        questionText.style.backgroundClip = 'unset';
        questionText.style.WebkitTextFillColor = 'unset';
        questionText.style.color = '';
      }
    };

    const handleClick = item => () => {
      const isOpen = item.classList.contains('is-open');

      items.forEach(other => {
        if (other !== item && other.classList.contains('is-open')) {
          closeItem(other);
        }
      });

      if (isOpen) {
        closeItem(item);
      } else {
        openItem(item);
        const questionText = item.querySelector('.faq_question_text');
        if (questionText) trackFAQOpen(questionText.textContent.trim());
      }
    };

    items.forEach(item => {
      const button = item.querySelector('.faq_question');
      if (!button) return;
      const handler = handleClick(item);
      button.addEventListener('click', handler);
      // Store handler for cleanup
      item._faqHandler = handler;
    });

    return () => {
      items.forEach(item => {
        const button = item.querySelector('.faq_question');
        if (button && item._faqHandler) {
          button.removeEventListener('click', item._faqHandler);
          delete item._faqHandler;
        }
      });
    };
  }, []);

  return (
    <section
      id="faq"
      className={`section_faq padding-section-medium ${className} background-color-white border-radius-all`.trim()}
    >
      <div className="padding-global">
        <div className="container-large">
          <div className="faq_header home-section-header">
            <div className="heading_wrap">
              <h2 className="home-section-title">
                {content.title[0]}
                <br />
                {content.title[1]}
              </h2>
            </div>
            <div className="subtitle_tag-wrapper hide-mobile-landscape">
              <div>{content.eyebrow}</div>
            </div>
          </div>
          <div className="faq_layout" data-animate-scope data-animate-default-preset="fade-up">
            <FAQVideo video={content.video} />
            <div className="faq_list">
              {items.map((item, i) => (
                <div key={i} className="faq_item" data-animate-order={i + 1}>
                  <button className="faq_question" aria-expanded="false">
                    <span className="faq_question_text">{item.q}</span>
                    <span className="faq_toggle" aria-hidden="true" />
                  </button>
                  <div className="faq_answer">
                    <div className="faq_answer_inner">{item.answer.map(renderAnswerBlock)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { faqData };
