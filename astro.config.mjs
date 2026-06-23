import { defineConfig } from 'astro/config';

// Static site. `directory` build format gives clean URLs (/apps, /glimt) the way the old
// vercel.json cleanUrls did. Pages still being migrated live in public/ and are served as-is.
export default defineConfig({
  site: 'https://dynni.no',
  build: { format: 'directory' },
  trailingSlash: 'ignore',
});
