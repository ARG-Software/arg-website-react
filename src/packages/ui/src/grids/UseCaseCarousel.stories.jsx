import { UseCaseCarousel } from './UseCaseCarousel.jsx';

const ITEMS = [
  ['mojaloop', 'Mojaloop', 'Fintech', 'Mojaloop', '2021-2023'],
  ['dokutar', 'Dokutar', 'Document Automation', 'Dokutar', '2023-2024'],
  ['sky-tracks', 'SkyTracks', 'Music Technology', 'SkyTracks', '2022-2024'],
  ['vector', 'Vector', 'Trading', 'Vector', '2024-2025'],
].map(([key, title, credit, client, timeline]) => ({
  key,
  title,
  credit,
  meta: [client, timeline],
  image: `/images/projects/heroes/${key}-hero-1920.webp`,
  thumb: `/images/projects/heroes/${key}-thumb-500.webp`,
}));

export default {
  title: 'Grids/UseCaseCarousel',
  component: UseCaseCarousel,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'ARG dark' } },
};

export const Default = {
  render: () => (
    <UseCaseCarousel
      items={ITEMS}
      defaultIndex={1}
      eyebrow="Explore use cases"
      ctaText="View use case"
      ariaLabel="Use cases"
    />
  ),
};
