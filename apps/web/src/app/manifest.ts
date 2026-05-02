import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'eco-metrics earth',
    short_name: 'eco-metrics',
    start_url: '/',
    display: 'standalone',
    theme_color: '#10b981',
    background_color: '#000000',
    icons: [
      {
        src: '/icons/eco-metrics-earth.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
