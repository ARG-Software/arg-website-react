import React, { useEffect } from 'react';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { trackFAQOpen } from '../../../hooks/useAnalytics';
import { SectionDivider } from '../../../components/layout/SectionDivider';

const faqData = [
  {
    q: 'How much does custom software development cost?',
    a: (
      <>
        <p>
          The cost depends entirely on scope, complexity, integrations, and scalability
          requirements. An MVP with a focused feature set is very different from a multi-role
          platform with complex workflows and third-party integrations.
        </p>
        <p>Instead of fixed pricing, we provide:</p>
        <ul>
          <li>A structured discovery phase</li>
          <li>Technical breakdown of features</li>
          <li>Architecture recommendations</li>
          <li>A realistic timeline and budget range</li>
        </ul>
        <p>This ensures clarity and prevents scope surprises later.</p>
      </>
    ),
  },
  {
    q: 'How long does it take to build an MVP?',
    a: (
      <>
        <p>Most MVPs are delivered within 8–14 weeks, depending on:</p>
        <ul>
          <li>Feature complexity</li>
          <li>UX/UI depth</li>
          <li>Integrations (payments, APIs, compliance, etc.)</li>
          <li>Performance or security constraints</li>
        </ul>
        <p>
          We work in short development cycles so you can validate quickly and iterate based on real
          user feedback.
        </p>
      </>
    ),
  },
  {
    q: 'Do you work with clients outside the USA and Europe?',
    a: (
      <>
        <p>
          Yes. We collaborate with companies in North America, South America, Europe, and globally.
          Our process is built for remote execution with:
        </p>
        <ul>
          <li>Structured sprint reviews</li>
          <li>Clear documentation</li>
          <li>Transparent progress tracking</li>
          <li>Reliable time zone overlap</li>
        </ul>
        <p>Location is never a limitation — communication and process matter more.</p>
      </>
    ),
  },
  {
    q: 'Do you work with startups or established companies?',
    a: (
      <>
        <p>Both. We support:</p>
        <ul>
          <li>Startups building and validating MVPs</li>
          <li>SMEs modernizing systems</li>
          <li>Scaling companies optimizing performance</li>
          <li>Enterprises building custom internal platforms</li>
        </ul>
        <p>Engagement models are tailored to your growth stage.</p>
      </>
    ),
  },
  {
    q: 'What technologies do you use?',
    a: (
      <>
        <p>
          We select technology based on long-term maintainability and scalability, not trends.
          Common stacks include:
        </p>
        <ul>
          <li>Web: React, Next.js, TypeScript</li>
          <li>Backend: Node.js, .NET, Java</li>
          <li>Cloud: AWS, Azure, GCP</li>
          <li>Mobile: React Native, Flutter</li>
          <li>Databases: PostgreSQL, MongoDB</li>
        </ul>
        <p>Architecture decisions are driven by business goals.</p>
      </>
    ),
  },
  {
    q: 'How do you ensure scalability and code quality?',
    a: (
      <>
        <p>We apply engineering best practices:</p>
        <ul>
          <li>Clean architecture principles</li>
          <li>Automated testing</li>
          <li>Code reviews</li>
          <li>CI/CD pipelines</li>
          <li>Infrastructure as Code</li>
          <li>Security-first design</li>
        </ul>
        <p>We build software meant to evolve — not to be rewritten after year one.</p>
      </>
    ),
  },
  {
    q: 'Can you scale our product after launch?',
    a: (
      <>
        <p>Yes. We frequently support clients post-launch with:</p>
        <ul>
          <li>Performance optimization</li>
          <li>Cloud cost optimization</li>
          <li>Feature expansion</li>
          <li>Dedicated team extension</li>
        </ul>
        <p>Our goal is long-term partnership, not one-off delivery.</p>
      </>
    ),
  },
  {
    q: 'Do you provide dedicated development teams?',
    a: (
      <>
        <p>Yes. You can work with:</p>
        <ul>
          <li>A cross-functional product team</li>
          <li>Dedicated engineers embedded into your internal team</li>
        </ul>
        <p>We adapt to your preferred collaboration model.</p>
      </>
    ),
  },
  {
    q: 'What is your development process?',
    a: (
      <>
        <p>Our structured process includes:</p>
        <ul>
          <li>Discovery &amp; technical planning</li>
          <li>Architecture design</li>
          <li>Agile sprint-based development</li>
          <li>Continuous QA &amp; testing</li>
          <li>Launch &amp; support</li>
        </ul>
        <p>You maintain full visibility and control throughout the lifecycle.</p>
      </>
    ),
  },
  {
    q: 'How do we get started?',
    a: (
      <>
        <p>We begin with a strategy call to understand:</p>
        <ul>
          <li>Your business goals</li>
          <li>Technical constraints</li>
          <li>Growth plans</li>
          <li>Timeline expectations</li>
        </ul>
        <p>
          From there, we provide a clear roadmap and proposal. No guesswork. No inflated promises.
        </p>
      </>
    ),
  },
];

export function FAQSection({ className = '' }) {
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
    <section id="faq" className={`section_faq padding-section-medium ${className}`.trim()}>
      <div className="padding-global">
        <div className="container-large">
          <div className="faq_header">
            <div className="heading_wrap">
              <h2 style={{ color: '#fff' }}>
                Common questions,
                <br />
                honest answers.
              </h2>
            </div>
            <div className="subtitle_tag-wrapper is--white hide-mobile-landscape">
              <div>FAQ</div>
            </div>
          </div>
          <div className="faq_list">
            {faqData.map((item, i) => (
              <div key={i} className="faq_item">
                <button className="faq_question" aria-expanded="false">
                  <span className="faq_question_text">{item.q}</span>
                  <div className="faq_icon arrow_icon-embed w-embed">{arrowSvg}</div>
                </button>
                <div className="faq_answer">
                  <div className="faq_answer_inner">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SectionDivider variant="light" hideOnMobile={true} />
    </section>
  );
}

export { faqData };
