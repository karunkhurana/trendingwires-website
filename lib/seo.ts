import type { Metadata } from 'next';

const BASE_URL = 'https://trendingwires.com';

export const SITE = {
  name:        'TrendingWires',
  tagline:     'Stay ahead with bite-sized trending stories',
  description: 'TrendingWires simplifies the world\'s most talked-about stories into engaging 30-second Shorts. AI • Tech • Business • Science • World • Innovation. New Shorts uploaded regularly.',
  url:         BASE_URL,
  logo:        `${BASE_URL}/logo.png`,
  twitter:     '@trending_wires',
  youtube:     'https://www.youtube.com/@trendingwires',
};

/** Base metadata shared across all pages */
export const baseMetadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default:  `${SITE.name} — Trending Stories in Under 60 Seconds`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    'trending news', 'short videos', 'AI news', 'tech news', 'business news',
    'world updates', 'science news', 'viral stories', 'youtube shorts',
    'trendingwires', 'bite-sized news', 'innovation news', '60 second news',
  ],
  authors:   [{ name: 'TrendingWires', url: BASE_URL }],
  creator:   'TrendingWires',
  publisher: 'TrendingWires',

  // Open Graph
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         BASE_URL,
    siteName:    SITE.name,
    title:       `${SITE.name} — Trending Stories in Under 60 Seconds`,
    description: SITE.description,
    images: [
      {
        url:    `${BASE_URL}/og-image.jpg`,
        width:  1200,
        height: 630,
        alt:    'TrendingWires — Trending Stories in 60 Seconds',
      },
    ],
  },

  // Twitter / X
  twitter: {
    card:        'summary_large_image',
    site:        SITE.twitter,
    creator:     SITE.twitter,
    title:       `${SITE.name} — Trending Stories in Under 60 Seconds`,
    description: SITE.description,
    images:      [`${BASE_URL}/og-image.jpg`],
  },

  // Robots
  robots: {
    index:             true,
    follow:            true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },

  // Canonical
  alternates: { canonical: BASE_URL },

  // Verification (fill in once verified)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },

  // App
  applicationName: SITE.name,
  category: 'news',
};

/** JSON-LD structured data for the home page */
export function homeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':       'WebSite',
        '@id':         `${BASE_URL}/#website`,
        url:           BASE_URL,
        name:          SITE.name,
        description:   SITE.description,
        potentialAction: {
          '@type':       'SearchAction',
          target:        `${BASE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type':        'Organization',
        '@id':          `${BASE_URL}/#organization`,
        name:           SITE.name,
        url:            BASE_URL,
        logo:           { '@type': 'ImageObject', url: SITE.logo },
        sameAs: [
          SITE.youtube,
          'https://instagram.com/trending_wires',
          'https://x.com/trending_wires',
          'https://linkedin.com/company/trendingwires',
          'https://facebook.com/trendingwires',
        ],
        contactPoint: {
          '@type':       'ContactPoint',
          email:         'contact@trendingwires.com',
          contactType:   'customer support',
        },
      },
    ],
  };
}

/** JSON-LD for a single video */
export function videoJsonLd(video: {
  id: string; title: string; description: string;
  thumbnail: string; publishedAt: string; duration?: string;
}) {
  return {
    '@context':          'https://schema.org',
    '@type':             'VideoObject',
    name:                video.title,
    description:         video.description,
    thumbnailUrl:        video.thumbnail,
    uploadDate:          video.publishedAt,
    duration:            video.duration ? `PT${video.duration.replace(':', 'M')}S` : undefined,
    embedUrl:            `https://www.youtube.com/embed/${video.id}`,
    contentUrl:          `https://www.youtube.com/watch?v=${video.id}`,
    publisher: {
      '@type': 'Organization',
      name:    SITE.name,
      logo:    { '@type': 'ImageObject', url: SITE.logo },
    },
  };
}
