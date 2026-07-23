/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'img.youtube.com',
      'i.ytimg.com',
      'i3.ytimg.com',
    ],
  },
  output: 'standalone',
  // Expose server-only env vars to Next.js runtime explicitly
  env: {
    ADMIN_PASSWORD:              process.env.ADMIN_PASSWORD              || '',
    DYNAMODB_VIDEOS_TABLE:       process.env.DYNAMODB_VIDEOS_TABLE       || 'tw-videos',
    DYNAMODB_SUBSCRIBERS_TABLE:  process.env.DYNAMODB_SUBSCRIBERS_TABLE  || 'tw-subscribers',
    APP_REGION:                  process.env.APP_REGION                  || 'ap-south-1',
    TW_AWS_KEY_ID:               process.env.TW_AWS_KEY_ID               || '',
    TW_AWS_SECRET:               process.env.TW_AWS_SECRET               || '',
    NEXT_PUBLIC_PIPELINE_URL:    process.env.NEXT_PUBLIC_PIPELINE_URL    || 'http://localhost:3333',
  },
};

module.exports = nextConfig;
