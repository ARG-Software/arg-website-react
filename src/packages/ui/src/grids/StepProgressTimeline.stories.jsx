import { StepProgressTimeline } from './StepProgressTimeline.jsx';

const ITEMS = [
  { title: 'Connect', description: 'Attach the data source or product workspace.' },
  { title: 'Configure', description: 'Pick defaults, permissions, and notification rules.' },
  { title: 'Preview', description: 'Review the experience before enabling it for users.' },
  { title: 'Launch', description: 'Publish the flow and monitor the first interactions.' },
];

export default {
  title: 'Grids/StepProgressTimeline',
  component: StepProgressTimeline,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export const SetupSteps = {
  render: () => (
    <main className="storybook-showcase storybook-showcase--light storybook-showcase--center">
      <section className="storybook-frame storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Step progress</p>
          <h1 className="storybook-title storybook-title--sm">
            Sequential setup with active state.
          </h1>
        </div>
        <StepProgressTimeline items={ITEMS} autoAdvance={false} />
      </section>
    </main>
  ),
};
