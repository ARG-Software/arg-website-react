import { Marquee } from '@ui/layout/Marquee.jsx';
import HOMEPAGE from '../../../data/homePage.json';

export function ServicesMarqueeSection({ className = '', items = HOMEPAGE.infinityBand }) {
  return (
    <section
      className={`section_infinity background-color-gray overflow-hidden ${className}`.trim()}
      data-animate-scope
      data-animate-default-preset="fade-up"
    >
      <Marquee repetitions={2} trackClassName="infinity_list">
        <p className="infinity_text" data-animate="fade-up">
          {items.map(service => (
            <span className="infinity_item" key={service}>
              <span className="infinity_label">{service}</span>
              <span className="infinity_dot" aria-hidden="true">
                •
              </span>
            </span>
          ))}
        </p>
      </Marquee>
    </section>
  );
}
