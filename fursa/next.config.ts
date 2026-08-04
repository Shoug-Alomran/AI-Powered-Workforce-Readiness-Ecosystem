import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Admin's CommonJS JWT verifier must resolve JOSE's Node entrypoint.
  // Bundling these packages can incorrectly select JOSE's ESM-only web build
  // in the Vercel Node runtime.
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose", "@libsql/client", "@prisma/adapter-libsql"],
};

export default nextConfig;
