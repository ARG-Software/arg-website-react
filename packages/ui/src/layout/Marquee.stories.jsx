import { Marquee } from './Marquee.jsx';
import { SectionTicker } from './SectionTicker.jsx';

const ITEMS = ['Workflow', 'Analytics', 'Docs', 'Webhooks', 'Console', 'Assistant'];

export default {
  title: 'Layout/Marquee',
  component: Marquee,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ARG dark' },
  },
};

export function IntegrationRail() {
  return (
    <main className="storybook-showcase storybook-showcase--center">
      <section className="storybook-frame storybook-section">
        <SectionTicker label="Motion rail" />
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Continuous context</p>
          <h1 className="storybook-title storybook-title--sm">
            A moving rail for product surfaces.
          </h1>
          <p className="storybook-copy">
            Use the marquee when repeated labels or integrations add momentum without carrying the
            primary message.
          </p>
        </div>
        <Marquee
          items={ITEMS}
          outerClassName="storybook-marquee-outer"
          trackClassName="storybook-marquee-track"
          setClassName="storybook-marquee-set"
          speed={36}
          renderItem={item => <span className="storybook-marquee-item">{item}</span>}
        />
      </section>
    </main>
  );
}
