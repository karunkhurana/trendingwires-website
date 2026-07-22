import type { MetadataRoute } from 'next';

const BASE = 'https://trendingwires.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const categories = ['ai-tech', 'business', 'world', 'science', 'social', 'innovation'];

  return [
    {
      url:              BASE,
      lastModified:     new Date(),
      changeFrequency: 'hourly',
      priority:         1,
    },
    ...categories.map(cat => ({
      url:              `${BASE}/?category=${cat}`,
      lastModified:     new Date(),
      changeFrequency: 'daily' as const,
      priority:         0.8,
    })),
    {
      url:              `${BASE}/about`,
      lastModified:     new Date(),
      changeFrequency: 'monthly' as const,
      priority:         0.5,
    },
  ];
}
