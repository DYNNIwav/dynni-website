import { defineConfig } from 'astro/config';

// Static site. `file` format mirrors the old static URL structure (/glimt/privacy.html served
// clean as /glimt/privacy by vercel.json cleanUrls), so existing relative links like
// ./child-safety keep resolving correctly. Pages still being migrated live in public/ as-is.
export default defineConfig({
  site: 'https://dynni.no',
  build: { format: 'file' },
  trailingSlash: 'ignore',
});
