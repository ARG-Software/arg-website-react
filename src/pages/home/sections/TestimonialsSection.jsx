import { SectionDivider } from '../../../components/layout/SectionDivider';

const testimonialsData = [
  {
    quote:
      'It was a pleasure to work with! Good communication solid work and helped us deliver our new version of the product in a timely fashionable way.',
    author: 'Marc-André Mignault, Project Manager at Skytracks',
    dotId: 'faa6979d-8144-f4a3-6be9-c26ecc9a40fd',
  },
  {
    quote:
      "ARG Software were great to work with from the first day. We needed a MVP for our tourism management company and they provided all the technical solutions we required, optimizing and improving our day-to-day operations. I definitely recommend ARG Software's team for their effort and great work. Thank you so much!",
    author: 'Andre Mendo, CEO at Hostelier',
    dotId: 'bf504b4b-1161-e79a-96ef-c29cdd486ba3',
  },
  {
    quote:
      'Jose and Rui delivered good work and I enjoyed working with them. They transformed a legacy api from PHP to Typescript, where their architectural skills in building an object-oriented backend where really handy. They were quick in extending their knowledge and competence in Typescript-based projects to successfully complete the project. It is likely that we will hire them in the future for projects.',
    author: 'Hendrik, CTO at Dokutar',
    dotId: '07264434-2777-74fe-8629-cb6c9e094588',
  },
  {
    quote:
      'ARG did great! Was awesome to work with and always quick to respond. Great attitude despite project requirements changing. Also helped out in a few tight spots with last-minute requests — highly recommend working with ARG!',
    author: 'Austin Klise, CEO at Klise Consulting',
    dotId: 'e59cb7d2-1243-e68c-11be-70a6548fdabf',
    isLast: true,
  },
];

export function TestimonialsSection({ className = '' }) {
  return (
    <section
      id="testimonials"
      className={`section_testemonials padding-section-large ${className}`.trim()}
    >
      <div className="padding-global">
        <div className="container-medium">
          <div className="testemonials-component">
            {testimonialsData.map((t, i) => (
              <div key={i} className="testemonials-item">
                <div className="max-width-testemonials align-center">
                  <div className="overflow-hidden">
                    <p
                      data-w-id={i === 0 ? 'c104cc9d-84e0-284d-9f0d-8399721834c5' : undefined}
                      className="text-size-24-18"
                    >
                      {t.quote}
                    </p>
                  </div>
                  <div className="padding-bottom padding-40-32"></div>
                  <div className="testemonials-item_name">
                    <div
                      data-w-id={t.dotId}
                      style={{ opacity: 0 }}
                      className="testemonials-item_dot"
                    ></div>
                    <div className="text-size-18-15">{t.author}</div>
                  </div>
                </div>
                {!t.isLast && (
                  <>
                    <div className="padding-bottom padding-80-40"></div>
                    <SectionDivider variant="testimonials" />
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
