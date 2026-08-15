import { ImageGallery } from './ImageGallery.jsx';

const IMAGES = [
  { caption: 'Dashboard overview' },
  { caption: 'Workflow builder' },
  { caption: 'Analytics detail' },
  { caption: 'Settings panel' },
  { caption: 'Mobile summary' },
];

export default {
  title: 'Grids/ImageGallery',
  component: ImageGallery,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export const PlaceholderMosaic = {
  render: () => (
    <main className="storybook-showcase storybook-showcase--light">
      <section className="storybook-frame storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Image gallery</p>
          <h1 className="storybook-title storybook-title--sm">
            Mosaic preview with lightbox states.
          </h1>
          <p className="storybook-copy">
            Placeholder tiles show the gallery layout without depending on a product-specific asset
            set.
          </p>
        </div>
        <ImageGallery images={IMAGES} />
      </section>
    </main>
  ),
};
