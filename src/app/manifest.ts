import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '3A Game Master',
    short_name: '3A Game',
    description: 'Ultimate AAA Game Guides, Boss Strategies & Walkthroughs',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a1a',
    theme_color: '#7c3aed',
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
