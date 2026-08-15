import { UiButton } from './UiButton.jsx';

export default {
  title: 'UI/Button',
  component: UiButton,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'ARG dark' } },
};

export function Variants() {
  return (
    <main className="storybook-showcase storybook-showcase--center">
      <section className="storybook-frame storybook-frame--sm storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Admin primitive</p>
          <h1 className="storybook-title storybook-title--sm">Compact product controls.</h1>
        </div>
        <div className="storybook-row">
          <UiButton>Primary</UiButton>
          <UiButton variant="secondary">Secondary</UiButton>
          <UiButton variant="ghost">Ghost</UiButton>
        </div>
      </section>
    </main>
  );
}
