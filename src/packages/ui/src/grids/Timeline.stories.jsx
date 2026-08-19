import { Timeline } from './Timeline.jsx';

const CLIENTS = [
  { slug: 'alpha', name: 'Alpha', start: '2021-02', end: '2022-07' },
  { slug: 'beta', name: 'Beta', start: '2022-01', ongoing: true },
  { slug: 'gamma', name: 'Gamma', start: '2023-04', end: '2024-04' },
  { slug: 'delta', name: 'Delta', start: '2024-06', ongoing: true },
];

export default {
  title: 'Grids/Timeline',
  component: Timeline,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export const ProductActivity = {
  render: () => (
    <main className="storybook-showcase storybook-showcase--light">
      <section className="storybook-frame storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Timeline</p>
          <h1 className="storybook-title storybook-title--sm">
            Long-running relationships and phases.
          </h1>
        </div>
        <Timeline
          animate={false}
          heading="Product activity timeline"
          clients={CLIENTS}
          yearStart={2021}
          ctaText="Next phase"
          ctaButtonText="Plan now"
        />
      </section>
    </main>
  ),
};
