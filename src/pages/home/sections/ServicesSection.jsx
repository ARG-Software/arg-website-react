import { useRef } from 'react';
import { useThreeSphereBackground } from '../../../hooks/useThreeSphereBackground';
import { SectionDivider } from '../../../components/layout/SectionDivider';

const SERVICES = [
  {
    number: '01',
    heading: 'Product Discovery + Prototyping',
    tags: ['Product Design', 'Prototyping'],
    content:
      "You have to love it, but the truth is: we're thinking about your customer from day one. We study your ideas before transforming them into actionable plans, by analyzing your business needs, market trends, and customer demands. Only then do you get an in-depth roadmap to create your digital product. Let's build one that doesn't just enter the market but leads it.",
  },
  {
    number: '02',
    heading: 'MVP Launch',
    tags: ['Minimum Viable Product', 'Launch', 'AI'],
    content:
      "You guessed it right: the proper strategy can do you places. Launch your MVP flawlessly with a streamlined approach. We combine human expertise with AI-powered insights to refine your concept, validate assumptions, and prioritize what really matters. Get expert advice from concept to market launch, focusing on your MVP's prime features. This fast, data-driven strategy works wonders in today's fast-paced business world. So, rest assured, your (minimum) effort will land optimal results.",
  },
  {
    number: '03',
    heading: 'Frontend Development',
    tags: ['Maintainable', 'Scalable'],
    content:
      'Build a website or app that adjusts, adapts, and delivers clear messages. You can only get this by creating a smooth experience across all devices — for everyone. Function and appeal have never looked so good.',
  },
  {
    number: '04',
    heading: 'Backend Development',
    tags: ['Efficient', 'Scalable'],
    content:
      "The behind-the-scenes nobody sees is where everything starts. Build your website or app from the basics: databases, servers, and accounts. We handle what users don't see, assuring everything runs smoothly whenever they land on your (brand-new) digital product. Bet on a solution that scales with your business.",
  },
  {
    number: '05',
    heading: 'Server Infrastructure',
    tags: ['DevOps', 'Cloud'],
    content:
      'Set up robust server infrastructure with automated deployment pipelines. We build scalable, secure, and cost-effective solutions that grow with your business. From cloud architecture to CI/CD, we handle the foundation so you can focus on building features.',
  },
  {
    number: '06',
    heading: 'Automation',
    tags: ['Efficiency', 'AI'],
    content:
      "Efficiency isn't just a goal—it's a strategy. Streamline your operations with smart automation that removes friction and frees your team to focus on what truly matters. Combining proven workflows with AI-powered optimization, we help you cut manual effort, reduce errors, and move faster than ever. From automating repetitive tasks to orchestrating complex processes, our approach ensures every system works in sync.",
  },
];

export function ServicesSection({ className = '' }) {
  const containerRef = useRef(null);

  useThreeSphereBackground('spheres-canvas');

  return (
    <section
      id="services"
      className={`services_wrap background-color-white padding-section-xlarge ${className}`.trim()}
      ref={containerRef}
    >
      <div className="services_contain container padding-global">
        <div className="services_grid">
          <div className="services_illustration">
            <div className="services-sticky_spline-embed">
              <canvas id="spheres-canvas"></canvas>
            </div>
          </div>
          <div className="services_list">
            {SERVICES.map((service, index) => (
              <div key={index} className="services_item">
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
