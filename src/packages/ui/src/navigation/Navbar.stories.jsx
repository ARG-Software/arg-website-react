import { Navbar } from './Navbar.jsx';

function MockLogo() {
  return (
    <svg viewBox="0 0 64 40" aria-hidden="true">
      <rect x="6" y="8" width="22" height="8" fill="currentColor" />
      <rect x="6" y="18" width="36" height="8" fill="currentColor" />
      <rect x="32" y="28" width="20" height="8" fill="currentColor" />
    </svg>
  );
}

const meta = {
  title: 'Navigation/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ARG dark' },
  },
  args: {
    logo: <MockLogo />,
    meetingHref: '#',
    meetingLabel: 'Start setup',
    meetingHoverLabel: 'Open flow',
    navStyle: {
      position: 'relative',
      top: 0,
      left: 0,
      right: 0,
      background: '#0c002e',
      paddingTop: '1.5rem',
      paddingBottom: '1rem',
    },
  },
};

export default meta;

export const Default = {
  decorators: [
    Story => (
      <main className="storybook-nav-surface">
        <Story />
      </main>
    ),
  ],
};

export const MenuOpen = {
  args: {
    menuOpen: true,
  },
  decorators: [
    Story => (
      <main className="storybook-nav-surface">
        <Story />
      </main>
    ),
  ],
};
