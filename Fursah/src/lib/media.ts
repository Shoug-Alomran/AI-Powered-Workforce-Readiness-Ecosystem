/**
 * Large media is served from the Cloudflare R2 bucket rather than from
 * `public/`, so the repository and the Vercel deployment stay small. Set
 * `NEXT_PUBLIC_DEMO_VIDEO_URL` to the bucket's public URL for
 * `videos/fursah-demo.mp4` — either the r2.dev development URL or a custom
 * domain bound to the bucket. The bucket must expose public read access for
 * the browser to stream it.
 *
 * The value is read at build time and inlined, so an unset variable simply
 * removes the player from the page instead of rendering a broken one.
 */
export const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL?.trim() || "";
