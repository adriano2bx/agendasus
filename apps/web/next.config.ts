import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
    ];
  },
  // Type checking runs independently in CI (`pnpm typecheck`). This avoids a
  // Next.js 16/TypeScript workspace parser issue during the production build.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
