import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
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
