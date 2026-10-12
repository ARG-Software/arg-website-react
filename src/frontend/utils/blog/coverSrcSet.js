import COVER_SIZES from '../../data/blogCoverSizes.json';

// Sizes come from `npm run blog:covers`; a cover without generated sizes has no srcSet.
export function getCoverSrcSet(src) {
  const widths = COVER_SIZES[src];
  if (!widths) return undefined;

  const fullWidth = widths[widths.length - 1];
  return widths
    .map(
      width => `${width === fullWidth ? src : src.replace(/\.webp$/, `-${width}.webp`)} ${width}w`
    )
    .join(', ');
}
