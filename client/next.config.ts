import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Don't let `next dev` write an AGENTS.md file into the project.
  agentRules: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
