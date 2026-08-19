import { UiSpinner } from './UiSpinner.jsx';

const meta = {
  title: 'Primitives/UiSpinner',
  component: UiSpinner,
  parameters: {
    backgrounds: { default: 'ARG dark' },
  },
};

export default meta;

export function Default() {
  return <UiSpinner />;
}

export function WithLabel() {
  return <UiSpinner label="Loading records…" />;
}
