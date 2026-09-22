/** Bare demo filenames resolve under Vite `public/demo-assets/`. */
export function demoAssetUrl(file?: string): string | undefined {
  if (!file) return file;
  if (/^(?:https?:)?\/\//i.test(file) || file.startsWith('/')) return file;
  return `${import.meta.env.BASE_URL}demo-assets/${file}`;
}
