import { Footer } from './Footer.jsx';

const MOCK_FOOTER = {
  brand: {
    logo: <div className="storybook-logo-mark">UI</div>,
    tagline: 'Reusable Product Interface Kit',
  },
  columns: [
    {
      title: 'Navigate',
      items: [
        { label: 'Updates', path: '/updates/' },
        { label: 'Docs', path: '/docs/' },
        { label: 'About', path: '/about/' },
        { label: 'Support', path: '/support/' },
        { label: 'Contact', path: '/contact/' },
      ],
    },
    {
      title: 'Product',
      items: [
        { label: 'Dashboard' },
        { label: 'Automation' },
        { label: 'Insights' },
        { label: 'Integrations' },
      ],
    },
    {
      title: 'Socials',
      items: [
        { label: 'GitHub', href: 'https://github.com', external: true },
        { label: 'LinkedIn', href: 'https://linkedin.com', external: true },
        { label: 'Status', href: 'https://example.com/status', external: true },
      ],
    },
    {
      title: 'Contact',
      items: [
        { label: 'Remote-first team' },
        {
          label: 'hello@example.com',
          href: 'mailto:hello@example.com',
          className: 'footer-col-text',
        },
      ],
    },
  ],
  legalLinks: [
    { label: 'Privacy Policy', path: '/privacy/' },
    { label: 'Terms of Service', path: '/terms/' },
  ],
  copyright: '© 2026 Example Product. All rights reserved.',
};

const meta = {
  title: 'Layout/Footer',
  component: Footer,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ARG dark' },
  },
};

export default meta;

export const Default = {
  args: {
    ...MOCK_FOOTER,
    animate: false,
  },
};
