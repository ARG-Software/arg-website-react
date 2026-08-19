import { Pill, PillButton } from './Pill.jsx';

export default {
  title: 'Pills/Pill',
  component: Pill,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'ARG dark' } },
};

export function Variants() {
  return (
    <main className="storybook-showcase storybook-showcase--center">
      <section className="storybook-frame storybook-frame--sm storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Pills</p>
          <h1 className="storybook-title storybook-title--sm">
            Small labels with product contrast.
          </h1>
        </div>
        <div className="storybook-row">
          <Pill variant="light">Light</Pill>
          <Pill variant="white">White</Pill>
          <Pill variant="dark">Dark</Pill>
          <Pill variant="outline">Outline</Pill>
          <Pill variant="glass">Glass</Pill>
          <PillButton active>Active button</PillButton>
        </div>
      </section>
    </main>
  );
}
