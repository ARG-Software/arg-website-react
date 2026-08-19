import { Breadcrumb } from './Breadcrumb.jsx';

const meta = {
  title: 'Navigation/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ARG dark' },
  },
  decorators: [
    Story => (
      <main className="storybook-showcase storybook-showcase--center">
        <section className="storybook-frame storybook-frame--md storybook-section">
          <div className="storybook-section__head">
            <p className="storybook-eyebrow">Breadcrumb</p>
            <h1 className="storybook-title storybook-title--sm">Quiet path context.</h1>
          </div>
          <Story />
        </section>
      </main>
    ),
  ],
};

export default meta;

export const PagePath = {
  args: {
    items: [{ label: 'Home', path: '/' }, { label: 'Product setup' }],
  },
};

export const ContentPath = {
  args: {
    items: [
      { label: 'Home', path: '/' },
      { label: 'Updates', path: '/updates/' },
      { label: 'Product', isTag: true },
      { label: 'Release notes' },
    ],
  },
};

export const Light = {
  args: {
    variant: 'light',
    items: [
      { label: 'Home', path: '/' },
      { label: 'Settings', path: '/settings/' },
      { label: 'Billing' },
    ],
  },
  parameters: {
    backgrounds: { default: 'White' },
  },
  decorators: [
    Story => (
      <main className="storybook-showcase storybook-showcase--light storybook-showcase--center">
        <section className="storybook-frame storybook-frame--md storybook-section">
          <div className="storybook-section__head">
            <p className="storybook-eyebrow">Breadcrumb</p>
            <h1 className="storybook-title storybook-title--sm">Light page navigation.</h1>
          </div>
          <Story />
        </section>
      </main>
    ),
  ],
};
