const PROJECT_GALLERY_CONFIG = {
  dokutar: {
    count: 3,
    width: 3840,
    height: 2880,
    widths: [360, 640, 828, 1080, 1440, 1920, 2560, 3840],
  },
  mojaloop: {
    count: 4,
    width: 3840,
    height: 2880,
    widths: [360, 640, 828, 1080, 1440, 1920, 2560, 3840],
  },
  'peoples-clearinghouse': {
    count: 9,
    width: 3073,
    height: 3840,
    widths: [360, 640, 828, 1080, 1440, 1920, 2560, 3073],
  },
  'royalty-flush': {
    count: 3,
    width: 3840,
    height: 2560,
    widths: [360, 640, 828, 1080, 1440, 1920, 2560, 3840],
  },
  'sky-tracks': {
    count: 4,
    width: 3840,
    height: 2880,
    widths: [360, 640, 828, 1080, 1440, 1920, 2560, 3840],
  },
  'tv-cine': {
    count: 3,
    width: 3840,
    height: 2880,
    widths: [360, 640, 828, 1080, 1440, 1920, 2560, 3840],
  },
  vector: {
    count: 4,
    width: 3840,
    height: 2560,
    widths: [360, 640, 828, 1080, 1440, 1920, 2560, 3840],
  },
};

export function getProjectGallery(slug, title) {
  const config = PROJECT_GALLERY_CONFIG[slug];
  if (!config) return [];

  return Array.from({ length: config.count }, (_, index) => {
    const imageNumber = String(index + 1).padStart(2, '0');
    const caption = `${title} interface screen ${index + 1}`;
    const basePath = `/images/projects/gallery/${slug}/${slug}-gallery-${imageNumber}`;

    return {
      src: `${basePath}-${config.width}.webp`,
      srcSet: config.widths.map(width => `${basePath}-${width}.webp ${width}w`).join(', '),
      sizes: '(max-width: 47.9375rem) 50vw, 45vw',
      alt: caption,
      caption,
      width: config.width,
      height: config.height,
    };
  });
}
