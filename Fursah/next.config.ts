import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Partial prerendering: the static shell of every route is prerendered and
  // served from the CDN, while anything reading cookies or the database streams
  // in behind its Suspense boundary.
  cacheComponents: true,
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
    // Portal routes intentionally block on the viewer's session and database
    // record. Validate instant navigation only for routes that explicitly opt in.
    instantInsights: { validationLevel: "manual-warning" },
  },
  // Firebase Admin's CommonJS JWT verifier must resolve JOSE's Node entrypoint.
  // Bundling these packages can incorrectly select JOSE's ESM-only web build
  // in the Vercel Node runtime.
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose", "@libsql/client", "@prisma/adapter-libsql"],
  turbopack: {
    // A stray package-lock.json in the parent home directory otherwise makes
    // Turbopack misdetect the workspace root.
    root: path.join(__dirname),
  },
};

export default nextConfig;
