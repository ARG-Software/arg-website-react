import { AdminProfileMenu } from './AdminProfileMenu.jsx';

const meta = {
  title: 'Admin/AdminProfileMenu',
  component: AdminProfileMenu,
  parameters: {
    backgrounds: { default: 'ARG dark' },
  },
};

export default meta;

export function Default() {
  return (
    <AdminProfileMenu
      items={[
        { label: 'Settings', onClick: () => {} },
        { label: 'Log out', onClick: () => {} },
      ]}
    />
  );
}
