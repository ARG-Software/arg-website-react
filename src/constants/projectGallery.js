const PROJECT_GALLERY_CONFIG = {
  mojaloop: {
    count: 4,
    width: 1448,
    height: 1086,
    widths: [360, 640, 828, 1080, 1440, 1448],
  },
  'peoples-clearinghouse': {
    count: 9,
    width: 1122,
    height: 1402,
    widths: [360, 640, 828, 1080, 1122],
  },
  dokutar: {
    count: 3,
    width: 1448,
    height: 1086,
    widths: [360, 640, 828, 1080, 1440, 1448],
  },
  'sky-tracks': {
    count: 4,
    width: 1448,
    height: 1086,
    widths: [360, 640, 828, 1080, 1440, 1448],
  },
  'tv-cine': {
    count: 3,
    width: 1448,
    height: 1086,
    widths: [360, 640, 828, 1080, 1440, 1448],
  },
  'royalty-flush': {
    count: 3,
    width: 1536,
    height: 1024,
    widths: [360, 640, 828, 1080, 1440, 1536],
  },
  vector: {
    count: 4,
    width: 1536,
    height: 1024,
    widths: [360, 640, 828, 1080, 1440, 1536],
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
      sizes: '(max-width: 1023px) calc(100vw - 2.5rem), 36vw',
      alt: caption,
      caption,
      width: config.width,
      height: config.height,
    };
  });
}
