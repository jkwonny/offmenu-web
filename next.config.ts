import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['gtohpapexeriihzkoozu.supabase.co', 'itgvobngquppjrbbibis.supabase.co'],
  },

  // Add PostHog rewrites to proxy ingestion requests - only in production
  async rewrites() {
    // Only set up PostHog rewrites in production
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/ingest/static/:path*',
          destination: 'https://us-assets.i.posthog.com/static/:path*',
        },
        {
          source: '/ingest/:path*',
          destination: 'https://us.i.posthog.com/:path*',
        },
        {
          source: '/ingest/decide',
          destination: 'https://us.i.posthog.com/decide',
        },
      ];
    }
    
    // Return empty array for development
    return [];
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
