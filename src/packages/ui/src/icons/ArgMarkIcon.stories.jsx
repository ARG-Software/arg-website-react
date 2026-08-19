import { ArgMarkIcon } from './ArgMarkIcon.jsx';

const meta = {
  title: 'Icons/ArgMarkIcon',
  component: ArgMarkIcon,
  parameters: {
    backgrounds: { default: 'ARG dark' },
  },
};

export default meta;

export function Default() {
  return <ArgMarkIcon style={{ height: '4rem', width: 'auto' }} />;
}
