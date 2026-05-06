import { useRef } from 'react';
import { useThreeSphereBackground } from '../../../hooks/useThreeSphereBackground';
import { SectionDivider } from '../../../components/layout/SectionDivider';
import SERVICES from '../../../data/services.json';

export function ServicesSection({ className = '' }) {
  const containerRef = useRef(null);

  useThreeSphereBackground('spheres-canvas');

  return (
    <section
      id="services"
      className={`services_wrap background-color-white padding-section-xlarge ${className}`.trim()}
      ref={containerRef}
      data-animate-scope
      data-animate-default-stagger="80"
    >
      <div className="services_contain container padding-global">
        <div className="services_grid">
          <div className="services_illustration">
            <div className="services-sticky_spline-embed">
              <canvas id="spheres-canvas"></canvas>
            </div>
          </div>
          <div className="services_list">
            {SERVICES.details.map((service, index) => (
              <div key={index} className="services_item" data-animate="fade-up">
                <div className="services_item_number">
                  <div className="service_number_text">{service.number}</div>
                </div>
                <div className="services_item_heading">
                  <h3 className="services_heading_text">{service.heading}</h3>
                </div>
                <div className="services_item_content">
                  {service.tags && (
                    <div className="services_item_tag">
                      {service.tags.map((tag, tagIndex) => (
                        <div key={tagIndex} className="services-tag">
                          <div className="text-size-tiny">{tag}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="services_item_paragraph">{service.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SectionDivider variant="default" hideOnMobile={false} />
    </section>
  );
}
