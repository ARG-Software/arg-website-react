import { AnimatedArrowButton } from './AnimatedArrowButton.jsx';

const meta = {
  title: 'Buttons/AnimatedArrowButton',
  component: AnimatedArrowButton,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'ARG dark' },
  },
  decorators: [
    Story => (
      <main className="storybook-showcase storybook-showcase--center">
        <section className="storybook-frame storybook-frame--md storybook-section">
          <div className="storybook-section__head">
            <p className="storybook-eyebrow">CTA motion</p>
            <h1 className="storybook-title storybook-title--sm">
              Buttons with upward-right intent.
            </h1>
            <p className="storybook-copy">
              The hover copy slides vertically while the arrow follows the app’s diagonal direction.
            </p>
          </div>
          <div className="storybook-row">
            <Story />
          </div>
        </section>
      </main>
    ),
  ],
};

export default meta;

export const Variants = {
  render: () => (
    <>
      <AnimatedArrowButton hoverText="Open now">Primary action</AnimatedArrowButton>
      <AnimatedArrowButton variant="light" hoverText="Continue" href="#">
        Light link
      </AnimatedArrowButton>
      <AnimatedArrowButton variant="outline" hoverText="Preview" href="#">
        Outline link
      </AnimatedArrowButton>
      <AnimatedArrowButton variant="gradient" hoverText="Launch">
        Gradient
      </AnimatedArrowButton>
    </>
  ),
};

export const Sizes = {
  render: () => (
    <>
      <AnimatedArrowButton size="sm" hoverText="Small hover">
        Small
      </AnimatedArrowButton>
      <AnimatedArrowButton hoverText="Default hover">Medium</AnimatedArrowButton>
      <AnimatedArrowButton size="lg" hoverText="Large hover">
        Large
      </AnimatedArrowButton>
    </>
  ),
};
