import { AdminNav } from './AdminNav.jsx';

export default {
  title: 'Admin/AdminNav',
  component: AdminNav,
};

export const Default = {
  args: {
    items: [
      { href: '/admin/', label: 'Dashboard', isActive: true },
      { href: '/admin/sent/', label: 'Sent' },
      { href: '/admin/not-sent/', label: 'Not sent' },
      { href: '/admin/settings/', label: 'Settings' },
    ],
  },
};
