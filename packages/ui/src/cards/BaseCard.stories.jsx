import { BaseCard } from './BaseCard.jsx';
import { Pill } from '../pills/Pill.jsx';

export default {
  title: 'Cards/BaseCard',
  component: BaseCard,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ARG dark' },
  },
};

export function Variants() {
  return (
    <main className="storybook-showcase storybook-showcase--center">
      <section className="storybook-frame storybook-frame--md storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Card surfaces</p>
          <h1 className="storybook-title storybook-title--sm">Reusable cards with site rhythm.</h1>
        </div>
        <div className="storybook-grid">
          <BaseCard padding="lg">
            <Pill variant="dark">White card</Pill>
            <h3 className="storybook-card-title">Product summary</h3>
            <p className="storybook-card-copy">
              Use this surface for structured content, product summaries, or dashboard modules.
            </p>
          </BaseCard>
          <BaseCard variant="dark" padding="lg">
            <Pill variant="glass">Dark card</Pill>
            <h3 className="storybook-card-title">High-contrast module</h3>
            <p className="storybook-card-copy">
              Shared visual primitives can support dense panels without leaving the brand system.
            </p>
          </BaseCard>
        </div>
      </section>
    </main>
  );
}
