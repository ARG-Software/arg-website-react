import React, { useEffect } from 'react';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { trackFAQOpen } from '../../../utils/analytics';

const faqData = [
  {
    q: 'How much does custom software development cost?',
    a: (
      <>
        <p>
          Our typical rate is around 70 EUR/USD per hour, but we do not force every project into the
          same pricing model.
        </p>
        <p>
          For ongoing or evolving work, hourly or monthly collaboration can make sense. For smaller,
          well-defined projects, we can agree on an initial fee to start and a final payment on
          delivery. For larger scopes, payments can be split by milestones or deliverables.
        </p>
        <p>Each case is reviewed individually. Before estimating, we usually define:</p>
        <ul>
          <li>The core workflows</li>
          <li>The technical risks</li>
          <li>The architecture direction</li>
          <li>A realistic delivery range</li>
        </ul>
        <p>
          Scope changes must be communicated clearly. If a change affects the current direction,
          workload, timeline, or expected value, we review it together before continuing.
        </p>
      </>
    ),
  },
  {
    q: 'How long does it take to build an MVP?',
    a: (
      <>
        <p>Most focused MVPs take 8 to 14 weeks, depending on:</p>
        <ul>
          <li>Feature complexity</li>
          <li>Product clarity</li>
          <li>Integration depth</li>
          <li>Security or compliance needs</li>
        </ul>
        <p>
          We move quickly, but we do not build throwaway foundations. The goal is a product you can
          learn from and keep evolving.
        </p>
      </>
    ),
  },
  {
    q: 'Do you work with clients outside the USA and Europe?',
    a: (
      <>
        <p>
          Yes. ARG works remotely with teams across regions. What matters is not location, but
          whether the communication rhythm supports serious engineering work.
        </p>
        <ul>
          <li>Clear written context</li>
          <li>Direct technical conversations</li>
          <li>Predictable async updates</li>
          <li>Enough overlap for decisions</li>
        </ul>
        <p>If the problem is clear and the ownership is real, distance is not the blocker.</p>
      </>
    ),
  },
  {
    q: 'Do you work with startups or established companies?',
    a: (
      <>
        <p>Both. We support:</p>
        <ul>
          <li>Startups building launch-ready products</li>
          <li>Companies modernizing fragile systems</li>
          <li>Teams scaling performance or reliability</li>
          <li>Organizations building internal platforms</li>
        </ul>
        <p>The common thread is technical ownership, not company size.</p>
      </>
    ),
  },
  {
    q: 'What technologies do you use?',
    a: (
      <>
        <p>
          We choose technology for maintainability, team fit, and production requirements. The stack
          is a tool, not the strategy.
        </p>
        <ul>
          <li>Web: React, Next.js, TypeScript</li>
          <li>Backend: Node.js, .NET, Java</li>
          <li>Cloud: AWS, Azure, GCP</li>
          <li>Mobile: React Native and Flutter</li>
          <li>Databases: PostgreSQL, MongoDB</li>
        </ul>
        <p>The important part is choosing a system your team can operate after launch.</p>
      </>
    ),
  },
  {
    q: 'How do you ensure scalability and code quality?',
    a: (
      <>
        <p>Quality starts before implementation. We make the important decisions explicit:</p>
        <ul>
          <li>Architecture boundaries</li>
          <li>Testing strategy</li>
          <li>Code reviews</li>
          <li>CI/CD and release flow</li>
          <li>Observability and recovery paths</li>
          <li>Security and data constraints</li>
        </ul>
        <p>We build software meant to evolve, not be rewritten after year one.</p>
      </>
    ),
  },
  {
    q: 'Can you scale our product after launch?',
    a: (
      <>
        <p>Yes. Some of our most valuable work happens after launch:</p>
        <ul>
          <li>Performance optimization</li>
          <li>Reliability improvements</li>
          <li>Cloud and platform work</li>
          <li>Feature evolution</li>
          <li>Senior team extension</li>
        </ul>
        <p>We prefer long-term ownership over one-off handoffs.</p>
      </>
    ),
  },
  {
    q: 'Do you provide dedicated development teams?',
    a: (
      <>
        <p>Yes. Depending on the need, we can provide:</p>
        <ul>
          <li>A focused product team</li>
          <li>Senior engineers embedded with your team</li>
          <li>Architecture or consulting support</li>
        </ul>
        <p>We adapt the model to the work, but keep the team senior and accountable.</p>
      </>
    ),
  },
  {
    q: 'What is your development process?',
    a: (
      <>
        <p>Our process is intentionally simple:</p>
        <ul>
          <li>Understand the context</li>
          <li>Map the risks</li>
          <li>Design the architecture</li>
          <li>Build in short cycles</li>
          <li>Launch and stay close</li>
        </ul>
        <p>You get visibility without process theatre.</p>
      </>
    ),
  },
  {
    q: 'How do we get started?',
    a: (
      <>
        <p>Send us the context first. We look for the shape of the problem:</p>
        <ul>
          <li>Your product goals</li>
          <li>Technical constraints</li>
          <li>Current risks</li>
          <li>Timeline expectations</li>
        </ul>
        <p>
          If there is a fit, the first conversation is technical. If there is not, we will say that
          clearly.
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
    <section
      id="faq"
      className={`section_faq padding-section-medium ${className} background-color-white border-radius-all`.trim()}
    >
      <div className="padding-global">
        <div className="container-large">
          <div className="faq_header home-section-header">
            <div className="heading_wrap">
              <h2 className="home-section-title">
                Common questions,
                <br />
                honest answers.
              </h2>
            </div>
            <div className="subtitle_tag-wrapper hide-mobile-landscape">
              <div>FAQ</div>
            </div>
          </div>
          <div
            className="faq_list"
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            {faqData.map((item, i) => (
              <div key={i} className="faq_item" data-animate-order={i}>
                <button className="faq_question" aria-expanded="false">
                  <span className="faq_question_text">{item.q}</span>
                  <div className="faq_icon arrow_icon-embed">{arrowSvg}</div>
                </button>
                <div className="faq_answer">
                  <div className="faq_answer_inner">{item.a}</div>
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
