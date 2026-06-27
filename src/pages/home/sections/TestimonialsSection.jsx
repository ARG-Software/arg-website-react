import { SectionDivider } from '../../../components/layout/SectionDivider';

const testimonialsData = [
  {
    quote:
      'It was a pleasure to work with! Good communication, solid work, and helped us deliver our new version of the product in a timely fashion.',
    author: 'Marc-André Mignault, Project Manager at Skytracks',
  },
  {
    quote:
      "ARG Software were great to work with from the first day. We needed a MVP for our tourism management company and they provided all the technical solutions we required, optimizing and improving our day-to-day operations. I definitely recommend ARG Software's team for their effort and great work. Thank you so much!",
    author: 'Andre Mendo, CEO at Hostelier',
  },
  {
    quote:
      'Jose and Rui delivered good work and I enjoyed working with them. They transformed a legacy API from PHP to TypeScript, where their architectural skills in building an object-oriented backend were really handy. They were quick in extending their knowledge and competence in TypeScript-based projects to successfully complete the project. It is likely that we will hire them in the future for projects.',
    author: 'Hendrik, CTO at Dokutar',
  },
  {
    quote:
      'ARG did great! Was awesome to work with and always quick to respond. Great attitude despite project requirements changing. Also helped out in a few tight spots with last-minute requests — highly recommend working with ARG!',
    author: 'Austin Klise, CEO at Klise Consulting',
    isLast: true,
  },
];

export function TestimonialsSection({ className = '' }) {
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
            {testimonialsData.map((t, i) => (
              <div key={i} className="testimonials-item" data-animate-order={i}>
                <div className="max-width-testimonials align-center">
                  <div className="overflow-hidden">
                    <p className="testimonials-item_quote" data-animate-order={i * 2}>
                      {t.quote}
                    </p>
                  </div>
                  <div className="padding-bottom padding-40-32"></div>
                  <div className="testimonials-item_name" data-animate-order={i * 2 + 1}>
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
