/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: Do NOT add output: 'standalone' — breaks @netlify/plugin-nextjs
  reactStrictMode: true,

  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  images: {
    domains: [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
    ],
  },

  env: {
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_MAPBOX_TOKEN:      process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_APP_URL:           process.env.NEXT_PUBLIC_APP_URL,
  },

  // Stops Mapbox GL and MapLibre from crashing during server-side rendering
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'mapbox-gl', 'maplibre-gl']
    }
    return config
  },
}

module.exports = nextConfig