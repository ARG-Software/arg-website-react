import { AmbientVideoBackground } from './AmbientVideoBackground.jsx';

const meta = {
  title: 'Layout/AmbientVideoBackground',
  component: AmbientVideoBackground,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ARG dark' },
  },
};

export default meta;

export function Default() {
  return <AmbientVideoBackground src="/videos/hero-video-opt.mp4" />;
}
