import { NavMenu } from './NavMenu.jsx';

function MockLogo() {
  return (
    <svg viewBox="0 0 64 40" aria-hidden="true">
      <rect x="6" y="8" width="22" height="8" fill="currentColor" />
      <rect x="6" y="18" width="36" height="8" fill="currentColor" />
      <rect x="32" y="28" width="20" height="8" fill="currentColor" />
    </svg>
  );
}

const MENU_DATA = {
  primary: [
    { label: 'Products', to: '/products/', openInPage: true },
    { label: 'Updates', to: '/updates/' },
    { label: 'Docs', to: '/docs/' },
    { label: 'Contact', to: '/contact/' },
  ],
  featuredProjects: [
    { slug: 'launchpad', title: 'Launchpad', to: '/products/launchpad/' },
    { slug: 'insights', title: 'Insights', to: '/products/insights/' },
    { slug: 'workflow', title: 'Workflow', to: '/products/workflow/' },
  ],
  selectedWork: { viewAllTo: '/products/', viewAllLabel: 'All products' },
  company: {
    items: [
      { label: 'About', to: '/about/' },
      { label: 'Customers', to: '/customers/' },
      { label: 'Support', to: '/support/' },
    ],
  },
  latestPost: {
    slug: 'release-notes',
    to: '/updates/release-notes/',
    title: 'Release notes for the latest product cycle',
    tag: 'Product',
  },
  latest: { aiTitle: 'Open product assistant' },
  labels: {
    featured: 'Featured products',
    secondary: 'Resources',
    latest: 'Latest update',
    latestPlaceholder: 'No updates published yet',
    assistant: 'Open product assistant',
  },
};

const meta = {
  title: 'Navigation/NavMenu',
  component: NavMenu,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ARG dark' },
  },
  args: {
    ...MENU_DATA,
    isOpen: true,
    preview: true,
    logo: <MockLogo />,
    ctaHref: '#',
    ctaLabel: 'Start setup',
  },
};

export default meta;

export const Open = {};

export const WithoutLatestPost = {
  args: {
    latestPost: null,
  },
};
