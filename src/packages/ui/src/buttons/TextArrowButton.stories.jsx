import { TextArrowButton } from './TextArrowButton.jsx';

const meta = {
  title: 'Buttons/TextArrowButton',
  component: TextArrowButton,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'ARG dark' },
  },
};

export default meta;

export const Variants = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <TextArrowButton href="#" label="Read blog" hoverLabel="Browse posts" />
      <TextArrowButton href="#" label="Back to top" />
      <TextArrowButton href="#" label="Get in touch" roll={false} />
      <TextArrowButton href="#" label="Static, no underline" roll={false} underline={false} />
    </div>
  ),
};
