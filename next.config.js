/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'img.youtube.com',
      'i.ytimg.com',
      'i3.ytimg.com',
    ],
  },
  // Required for AWS Amplify hosting
  output: 'standalone',
};

module.exports = nextConfig;
