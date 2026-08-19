import { VerticalTimeline } from './VerticalTimeline.jsx';

const ITEMS = [
  {
    id: 'discover',
    period: '01',
    kicker: 'Discover',
    headline: 'Map the user journey.',
    summary: 'Start from real user needs and the workflows they need to complete.',
    highlights: ['Interview users', 'Group common tasks', 'Prioritize high-risk flows'],
    whyItMattered: 'The team gets a shared model before implementation starts.',
    details: [{ label: 'Output', text: 'Journey map and decision log', tone: 'accent' }],
  },
  {
    id: 'build',
    period: '02',
    kicker: 'Build',
    headline: 'Ship the core interaction model.',
    summary: 'Create reusable patterns that can be composed across screens.',
    highlights: ['Prototype states', 'Document component contracts', 'Validate accessibility'],
    details: [{ label: 'Output', text: 'Reusable UI primitives', tone: 'accent' }],
  },
  {
    id: 'scale',
    period: '03',
    kicker: 'Scale',
    headline: 'Turn product patterns into a system.',
    summary: 'Make the design language easy to reuse without losing distinct product moments.',
    highlights: ['Add tokens', 'Track adoption', 'Review edge cases'],
    details: [{ label: 'Output', text: 'Documented design system', tone: 'accent' }],
  },
];

export default {
  title: 'Grids/VerticalTimeline',
  component: VerticalTimeline,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export const ProductProcess = {
  render: () => (
    <main className="storybook-showcase storybook-showcase--light">
      <section className="storybook-frame storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Vertical timeline</p>
          <h1 className="storybook-title storybook-title--sm">A focused process narrative.</h1>
        </div>
        <VerticalTimeline items={ITEMS} />
      </section>
    </main>
  ),
};
