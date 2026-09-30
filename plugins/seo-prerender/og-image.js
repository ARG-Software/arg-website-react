import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export async function writeSocialJpeg(imageUrlPath, distDir) {
  if (!imageUrlPath) return null;

  const relative = imageUrlPath.replace(/^\//, '').replace(/\\/g, '/');
  const fromPublic = path.resolve('public', relative);
  const fromDist = path.join(distDir, relative);
  const source = fs.existsSync(fromPublic) ? fromPublic : fromDist;
  if (!fs.existsSync(source)) return null;

  const destRelative = relative.replace(/\.[^.]+$/u, '-og.jpg');
  const destPath = path.join(distDir, destRelative);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  await sharp(source)
    .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(destPath);

  return `/${destRelative}`;
}
