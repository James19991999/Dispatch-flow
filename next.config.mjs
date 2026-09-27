/** @type {import('next').NextConfig} */
const nextConfig = {
  // firebase-admin (and its transitive grpc/protobuf deps) is a Node-only
  // package that Next's default bundler sometimes mishandles when tracing
  // Route Handlers for Vercel's serverless functions — this is Firebase's
  // own documented recommendation for Next.js App Router deployments, and
  // closes a real class of "works locally, 500s on Vercel" failures that
  // can't be reproduced in a build sandbox with no Vercel deploy target.
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
