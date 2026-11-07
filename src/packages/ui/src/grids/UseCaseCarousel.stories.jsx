import { UseCaseCarousel } from './UseCaseCarousel.jsx';

const ITEMS = [
  ['mojaloop', 'Mojaloop', 'Fintech', 'Mojaloop'],
  ['dokutar', 'Dokutar', 'Document Automation', 'Dokutar'],
  ['sky-tracks', 'SkyTracks', 'Music Technology', 'SkyTracks'],
  ['vector', 'Vector', 'Trading', 'Vector'],
].map(([key, title, credit, client]) => ({
  key,
  title,
  credit,
  meta: [client],
  thumb: `/images/projects/heroes/${key}-thumb-500.webp`,
}));

export default {
  title: 'Grids/UseCaseCarousel',
  component: UseCaseCarousel,
  parameters: { layout: 'fullscreen' },
};

export const Default = {
  render: () => (
    <UseCaseCarousel
      items={ITEMS}
      defaultIndex={1}
      eyebrow="Explore other use cases"
      ctaText="View use case"
      ariaLabel="Use cases"
    />
  ),
};
