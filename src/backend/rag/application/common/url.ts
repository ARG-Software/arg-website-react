export function resolveUrl(url: string | null | undefined, siteUrl: string): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, siteUrl).toString();
  } catch {
    return url;
  }
}
