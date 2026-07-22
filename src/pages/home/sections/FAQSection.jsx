import React, { useEffect } from 'react';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { trackFAQOpen } from '../../../utils/analytics';
import HOMEPAGE from '../../../data/homepage.json';
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

export function FAQSection({ className = '', content = HOMEPAGE.faq, items = faqData }) {
  // Inlined useFAQAnimations hook
  useEffect(() => {
    const items = document.querySelectorAll('.faq_item');
    if (!items.length) return;

    const faqHeader = document.querySelector('.faq_header');
    if (faqHeader) {
      faqHeader.style.display = 'flex';
      faqHeader.style.justifyContent = 'space-between';
    }

    items.forEach(item => {
      const button = item.querySelector('.faq_question');
      const answer = item.querySelector('.faq_answer');
      if (!button || !answer) return;

      answer.style.overflow = 'hidden';
      answer.style.maxHeight = '0';
      answer.style.transition = 'max-height 0.55s cubic-bezier(0.16, 1, 0.3, 1)';

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
        questionText.style.background =
          'linear-gradient(90deg, #F0060D 0%, #C924D7 49%, #7904FD 100%)';
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
          <div
            className="faq_list"
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            {items.map((item, i) => (
              <div key={i} className="faq_item" data-animate-order={i}>
                <button className="faq_question" aria-expanded="false">
                  <span className="faq_question_text">{item.q}</span>
                  <div className="faq_icon arrow_icon-embed">{arrowSvg}</div>
                </button>
                <div className="faq_answer">
                  <div className="faq_answer_inner">{item.answer.map(renderAnswerBlock)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export { faqData };
