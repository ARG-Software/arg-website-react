import { AnimatedArrowButton } from '../buttons/AnimatedArrowButton.jsx';
import { BaseCard } from '../cards/BaseCard.jsx';
import { Pill } from '../pills/Pill.jsx';
import { SectionDivider } from './SectionDivider.jsx';
import { SectionSpacer } from './SectionSpacer.jsx';
import { SectionTicker } from './SectionTicker.jsx';

export default {
  title: 'Layout/Section Composition',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ARG dark' },
  },
};

export function ProductSection() {
  return (
    <main className="storybook-showcase">
      <section className="storybook-frame storybook-section">
        <SectionTicker label="Reusable section" />
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Composed primitives</p>
          <h1 className="storybook-title">A section shell that feels like the product.</h1>
          <p className="storybook-copy">
            Tickers, dividers, and spacers are structural pieces. This story shows them inside an
            actual section, where the rhythm and hierarchy make sense.
          </p>
        </div>

        <div className="storybook-grid">
          <BaseCard variant="glass" padding="lg" hover="none">
            <Pill variant="glass">Signal</Pill>
            <h3 className="storybook-card-title">Clear section hierarchy</h3>
            <p className="storybook-card-copy">
              The ticker anchors the block, the copy sets context, and the divider creates a clean
              transition to the next area.
            </p>
          </BaseCard>
          <BaseCard variant="glass" padding="lg" hover="none">
            <Pill variant="glass">Rhythm</Pill>
            <h3 className="storybook-card-title">Spacing with intent</h3>
            <p className="storybook-card-copy">
              The spacer is visible through composition, not as an isolated blank element.
            </p>
          </BaseCard>
        </div>

        <div className="storybook-row">
          <AnimatedArrowButton href="#" variant="light" hoverText="Open example">
            View pattern
          </AnimatedArrowButton>
          <AnimatedArrowButton href="#" variant="outline" hoverText="Continue">
            Secondary path
          </AnimatedArrowButton>
        </div>

        <SectionSpacer color="dark" size="sm" />
        <SectionDivider variant="white" />
      </section>
    </main>
  );
}
