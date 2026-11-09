import { useContext, useRef, useState } from 'react';
import { AnimatedArrowButton } from '@ui/buttons/AnimatedArrowButton.jsx';
import { ArgMarkIcon } from '@ui/icons/ArgMarkIcon.jsx';
import { trackEvent, trackFAQOpen } from '@services/analytics';
import { LenisContext } from '../../../providers/LenisProvider';
import { TransitionContext } from '../../../providers/TransitionProvider';
import HOMEPAGE from '../../../data/homePage.json';
import FAQ from '../../../data/faq.json';

const faqData = FAQ.items;
const ALL_TOPICS = 'All';

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

const playIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
  </svg>
);

// Fill `faq.video` in homePage.json: `src` for a file in /public, or `embedUrl` for a player
// (that host must also be allowed in frame-src in public/_headers). A small thumbnail sits in
// the header; the film itself plays large in a dialog over the page
function FAQVideo({ video = {} }) {
  const dialogRef = useRef(null);
  const lenis = useContext(LenisContext);
  const [open, setOpen] = useState(false);

  if (!video.src && !video.embedUrl) return null;

  const openFilm = () => {
    trackEvent('faq_film_open');
    setOpen(true);
    dialogRef.current.showModal();
    lenis?.stop();
  };

  // Closing by button, Escape or a click on the backdrop all end here
  const onClose = () => {
    setOpen(false);
    lenis?.start();
  };

  return (
    <>
      <button
        type="button"
        className="faq_video"
        onClick={openFilm}
        aria-label={`Play the ${video.title} film`}
      >
        <ArgMarkIcon className="faq_video-mark" />
        <span className="faq_video-bar">
          <span className="faq_video-play">{playIcon}</span>
          <span className="faq_video-label">{video.label}</span>
          <span className="faq_video-duration">{video.duration}</span>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="faq_film"
        aria-label={video.title}
        onClose={onClose}
        onClick={event => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <button
          type="button"
          className="faq_film-close"
          aria-label="Close the film"
          onClick={() => dialogRef.current.close()}
        />
        {/* Mounted only while open, so closing stops the film */}
        {open && video.embedUrl ? (
          <iframe
            src={video.embedUrl}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : null}
        {open && !video.embedUrl ? (
          <video
            src={video.src}
            poster={video.poster || undefined}
            title={video.title}
            controls
            autoPlay
            playsInline
          />
        ) : null}
      </dialog>
    </>
  );
}

export function FAQSection({ className = '', content = HOMEPAGE.faq, items = faqData }) {
  const [topic, setTopic] = useState(ALL_TOPICS);
  // Every question starts closed; the visitor opens the one they want
  const [openId, setOpenId] = useState(null);
  const { scrollToHash } = useContext(TransitionContext);

  const selectTopic = name => {
    setTopic(name);
    setOpenId(null);
  };

  const toggle = item => {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    trackFAQOpen(item.q);
  };

  const goToContact = event => {
    event.preventDefault();
    trackEvent('section_navigation', { section: 'contact', source: 'faq' });
    scrollToHash('contact', { duration: 2.4 });
  };

  return (
    <section
      id="faq"
      className={`section_faq padding-section-medium ${className} background-color-white border-radius-all`.trim()}
    >
      <div className="padding-global">
        <div className="container-large" data-animate-scope data-animate-default-preset="fade-up">
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

          {/* The filters on the left and the film thumbnail on the right share one row */}
          <div className="faq_toolbar">
            <div
              className="faq_topics"
              role="group"
              data-animate-order="1"
              aria-label="Filter questions by topic"
            >
              {content.topics.map(name => (
                <button
                  key={name}
                  type="button"
                  className={`faq_topic${topic === name ? ' is-active' : ''}`}
                  aria-pressed={topic === name}
                  onClick={() => selectTopic(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="faq_toolbar-video" data-animate-order="2">
              <FAQVideo video={content.video} />
            </div>
          </div>

          <div className="faq_list">
            {items.map((item, i) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className={`faq_item${isOpen ? ' is-open' : ''}`}
                  hidden={topic !== ALL_TOPICS && item.topic !== topic}
                  data-animate-order={i + 3}
                >
                  <button
                    type="button"
                    className="faq_question"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${item.id}`}
                    onClick={() => toggle(item)}
                  >
                    {/* Numbers stay global, so a filtered list keeps each question's number */}
                    <span className="faq_number">{String(i + 1).padStart(2, '0')}</span>
                    <span className="faq_question_text">{item.q}</span>
                    <span className="faq_toggle" aria-hidden="true" />
                  </button>
                  <div className="faq_answer" id={`faq-answer-${item.id}`}>
                    <div className="faq_answer_inner">{item.answer.map(renderAnswerBlock)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="faq_closing" data-animate-order={items.length + 3}>
            <p className="faq_closing-text">{content.closing.text}</p>
            <AnimatedArrowButton href="#contact" variant="dark" onClick={goToContact}>
              {content.closing.link}
            </AnimatedArrowButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export { faqData };
