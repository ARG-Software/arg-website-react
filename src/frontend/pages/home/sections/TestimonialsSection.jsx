import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import HOMEPAGE from '../../../data/homePage.json';

const testimonialsData = HOMEPAGE.testimonials;

export function TestimonialsSection({ className = '', testimonials = testimonialsData }) {
  return (
    <section
      id="testimonials"
      className={`section_testimonials padding-section-large ${className}`.trim()}
      data-animate-scope
      data-animate-trigger="scroll"
      data-animate-default-stagger="180"
      data-animate-default-preset="fade-up"
    >
      <div className="padding-global">
        <div className="container-medium">
          <div className="testimonials-component">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonials-item" data-animate-order={i}>
                <div className="max-width-testimonials align-center">
                  <div className="overflow-hidden">
                    <p className="testimonials-item_quote">{t.quote}</p>
                  </div>
                  <div className="padding-bottom padding-40-32"></div>
                  <div className="testimonials-item_name">
                    <div className="testimonials-item_dot"></div>
                    <div className="testimonials-item_author">{t.author}</div>
                  </div>
                </div>
                {!t.isLast && (
                  <>
                    <div className="padding-bottom padding-80-40"></div>
                    <SectionDivider variant="thin-light" data-animate="divider-expander-show" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export { testimonialsData };
