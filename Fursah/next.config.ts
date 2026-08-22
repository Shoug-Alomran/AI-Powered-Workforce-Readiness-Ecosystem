import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Partial prerendering: the static shell of every route is prerendered and
  // served from the CDN, while anything reading cookies or the database streams
  // in behind its Suspense boundary.
  cacheComponents: true,
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
    // Next writes `.next/lock` while building and deliberately leaks its file
    // descriptor, leaving the file to be removed when the build process exits.
    // On a build machine that is a race against whatever collects the output
    // directory next: Vercel enumerated `.next`, saw `lock`, and by the time it
    // called lstat the exiting build had taken the file away, which surfaces as
    // ENOENT on `.next/lock` reported after "Build Completed" even though the
    // build itself succeeded.
    //
    // The lock exists to stop two concurrent `next build` runs sharing one
    // directory, which cannot happen in a single-purpose build container. Not
    // creating it removes the race rather than hoping to win it.
    lockDistDir: false,
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
